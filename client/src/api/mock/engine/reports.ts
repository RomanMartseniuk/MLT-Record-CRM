/**
 * Звіти для головної сторінки (dashboard): показники, графіки, розбивки.
 *
 * Звіти лише ЧИТАЮТЬ дані й нічого не змінюють. Головне правило: закупівлі
 * і вкладення — різні події, їхні суми не додаються (закупівля не є витратою).
 * Усі суми в копійках; для графіків значення переведені в гривні й
 * округлені до цілих.
 *
 * Аналітика собівартості (фільтри, середня/мін/макс) — в `analytics.ts`.
 */

import type { DashboardMetrics, DateRange, NamedValue, SeriesPoint } from '@/api/contract/dto'
import { inRange, rangeDays } from './dates'
import { orderAllocations } from './allocations'
import { purchaseAllocatedKop, purchaseRemainingKop, purchaseTotalKop } from './purchases'
import { orderStatusCode } from './status'
import { totalStockValueKop } from './stock'
import type { Db } from './types'
import { sortBy, sum } from './util'

/**
 * Ключові показники за період.
 * «Активні заявки з вкладеннями» — заявки, які ще не видані (статус «Видано»
 * закриває заявку) і мають хоча б одне активне вкладення.
 */
export function dashboardMetrics(db: Db, range: DateRange): DashboardMetrics {
  const purchases = db.purchases.filter((item) => !item.cancelled && inRange(item.date, range))
  const allocations = db.allocations.filter(
    (item) => item.status === 'active' && inRange(item.createdAt, range),
  )

  const activeOrders = db.orders.filter((order) => {
    if (orderStatusCode(db, order.rawStatus) === 'closed') return false
    return orderAllocations(db, order.id).length > 0
  })

  return {
    purchasesKop: sum(purchases.map((item) => purchaseTotalKop(item))),
    allocatedKop: sum(allocations.map((item) => item.totalKop)),
    // Вартість складу не залежить від періоду: це знімок «зараз».
    stockValueKop: totalStockValueKop(db),
    activeOrdersWithAllocations: activeOrders.length,
    operationsCount: db.audit.filter((item) => inRange(item.at, range)).length,
  }
}

/* ─── Серії для графіків ───────────────────────────────────────────── */

/** Ключ кошика: рік-місяць або рік-місяць-день за ЛОКАЛЬНОЮ датою. */
function bucketKey(iso: string, byMonth: boolean): string {
  const date = new Date(iso)
  if (byMonth) return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Підпис кошика для осі графіка: «бер 26» для місяця, «12.03» для дня. */
function bucketLabel(key: string, byMonth: boolean): string {
  const parts = key.split('-')
  if (byMonth) {
    const months = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру']
    return `${months[Number(parts[1]) - 1]} ${parts[0].slice(2)}`
  }
  return `${parts[2]}.${parts[1]}`
}

/**
 * Закупівлі та вкладення по періодах.
 * Для періоду до 31 доби кошики — дні, довший період ділиться на місяці.
 */
export function moneySeries(db: Db, range: DateRange): SeriesPoint[] {
  const byMonth = rangeDays(range) > 31
  const buckets = new Map<string, SeriesPoint>()

  const ensure = (key: string) => {
    let point = buckets.get(key)
    if (!point) {
      point = { label: bucketLabel(key, byMonth), purchases: 0, allocations: 0 }
      buckets.set(key, point)
    }
    return point
  }

  // Спершу створюємо порожні кошики, щоб лінія графіка не рвалася.
  // `guard` не дає нескінченного циклу при некоректному періоді.
  const cursor = new Date(range.from)
  const end = new Date(range.to)
  let guard = 0
  while (cursor <= end && guard < 400) {
    ensure(bucketKey(cursor.toISOString(), byMonth))
    if (byMonth) cursor.setMonth(cursor.getMonth() + 1)
    else cursor.setDate(cursor.getDate() + 1)
    guard += 1
  }

  for (const purchase of db.purchases) {
    if (purchase.cancelled || !inRange(purchase.date, range)) continue
    ensure(bucketKey(purchase.date, byMonth)).purchases += purchaseTotalKop(purchase) / 100
  }

  for (const allocation of db.allocations) {
    if (allocation.status !== 'active' || !inRange(allocation.createdAt, range)) continue
    ensure(bucketKey(allocation.createdAt, byMonth)).allocations += allocation.totalKop / 100
  }

  return Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([, point]) => ({
      label: point.label,
      purchases: Math.round(point.purchases),
      allocations: Math.round(point.allocations),
    }))
}

/** Вкладення періоду по категоріях товарів (у гривнях), від більшої до меншої. */
export function categoryBreakdown(db: Db, range: DateRange): NamedValue[] {
  const byCategory = new Map<string, number>()
  for (const allocation of db.allocations) {
    if (allocation.status !== 'active' || !inRange(allocation.createdAt, range)) continue
    const product = db.products.find((item) => item.id === allocation.productId)
    if (!product) continue
    const category = db.categories.find((item) => item.id === product.categoryId)
    const name = category ? category.name : 'Без категорії'
    byCategory.set(name, (byCategory.get(name) ?? 0) + allocation.totalKop)
  }
  const rows: NamedValue[] = []
  for (const [name, kop] of byCategory) rows.push({ name, value: Math.round(kop / 100) })
  return sortBy(rows, (row) => -row.value)
}

/**
 * Закупівлі періоду, розділені на «У заявках» (вже вкладено) і «На складі»
 * (ще лежить у залишку). Разом це повна сума неcкасованих закупівель.
 */
export function allocatedVsStock(db: Db, range: DateRange): NamedValue[] {
  const purchases = db.purchases.filter((item) => !item.cancelled && inRange(item.date, range))
  const allocated = sum(purchases.map((item) => purchaseAllocatedKop(db, item)))
  const inStock = sum(purchases.map((item) => purchaseRemainingKop(db, item)))
  return [
    { name: 'У заявках', value: Math.round(allocated / 100) },
    { name: 'На складі', value: Math.round(inStock / 100) },
  ]
}
