/**
 * Аналітика собівартості.
 *
 * Показується лише собівартість (маржі й порівняння з сумою клієнта немає).
 * Собівартість заявки — сума її активних вкладень. Вибірка заявок будується
 * від вкладень: заявка потрапляє у звіт, лише якщо має хоча б одне активне
 * вкладення, що пройшло всі фільтри.
 */

import { EMPTY_FILTER } from '@/api/contract/constants'
import type { AnalyticsFilters, CostStats, DateRange, NamedValue } from '@/api/contract/dto'
import { orderAllocations, orderCostKop } from './allocations'
import { inRange } from './dates'
import { orderStatusCode } from './status'
import type { Db } from './types'
import { sortBy, sum } from './util'

/**
 * Ідентифікатори заявок, що проходять фільтри.
 * Фільтри за користувачем, категорією й постачальником діють на ВКЛАДЕННЯ,
 * тож заявка лишається, якщо хоч одне її вкладення їм відповідає.
 * Постачальник вкладення визначається за закупівлею, з партії якої воно списано.
 */
export function filteredOrderIds(db: Db, filters: AnalyticsFilters): string[] {
  const result: string[] = []
  for (const order of db.orders) {
    if (filters.status !== EMPTY_FILTER && orderStatusCode(db, order.rawStatus) !== filters.status) continue
    if (filters.assetType !== EMPTY_FILTER) {
      const asset = db.assets.find((item) => item.id === order.assetId)
      if (!asset || asset.type !== filters.assetType) continue
    }
    const allocations = orderAllocations(db, order.id).filter((allocation) => {
      if (!inRange(allocation.createdAt, filters.range)) return false
      if (filters.userId !== EMPTY_FILTER && allocation.createdById !== filters.userId) return false
      if (filters.categoryId !== EMPTY_FILTER) {
        const product = db.products.find((item) => item.id === allocation.productId)
        if (!product || product.categoryId !== filters.categoryId) return false
      }
      if (filters.supplierId !== EMPTY_FILTER) {
        const matches = allocation.lines.some((line) => {
          const batch = db.batches.find((item) => item.id === line.batchId)
          if (!batch) return false
          const purchase = db.purchases.find((item) => item.id === batch.purchaseId)
          return purchase ? purchase.supplierId === filters.supplierId : false
        })
        if (!matches) return false
      }
      return true
    })
    if (allocations.length === 0) continue
    result.push(order.id)
  }
  return result
}

/**
 * Кількість, сума, середня, мінімальна й максимальна собівартість заявок.
 * Заявки без вкладень (собівартість 0) не враховуються; для порожньої
 * вибірки повертаються нулі, а не NaN.
 */
export function costStats(db: Db, orderIds: string[]): CostStats {
  const costs = orderIds.map((orderId) => orderCostKop(db, orderId)).filter((kop) => kop > 0)
  if (costs.length === 0) return { count: 0, totalKop: 0, avgKop: 0, minKop: 0, maxKop: 0 }
  const total = sum(costs)
  return {
    count: costs.length,
    totalKop: total,
    avgKop: Math.round(total / costs.length),
    minKop: Math.min(...costs),
    maxKop: Math.max(...costs),
  }
}

/** Собівартість вибраних заявок за типом техніки (у гривнях), від більшої до меншої. */
export function costByAssetType(db: Db, orderIds: string[]): NamedValue[] {
  const byType = new Map<string, number>()
  for (const orderId of orderIds) {
    const order = db.orders.find((item) => item.id === orderId)
    if (!order) continue
    const asset = db.assets.find((item) => item.id === order.assetId)
    const name = asset ? asset.type : 'Інше'
    byType.set(name, (byType.get(name) ?? 0) + orderCostKop(db, orderId))
  }
  const rows: NamedValue[] = []
  for (const [name, kop] of byType) rows.push({ name, value: Math.round(kop / 100) })
  return sortBy(rows, (row) => -row.value)
}

/** Вкладення періоду за авторами (у гривнях), від більшої суми до меншої. */
export function costByEmployee(db: Db, range: DateRange): NamedValue[] {
  const byUser = new Map<string, number>()
  for (const allocation of db.allocations) {
    if (allocation.status !== 'active' || !inRange(allocation.createdAt, range)) continue
    byUser.set(allocation.createdById, (byUser.get(allocation.createdById) ?? 0) + allocation.totalKop)
  }
  const rows: NamedValue[] = []
  for (const [userId, kop] of byUser) {
    const user = db.users.find((item) => item.id === userId)
    rows.push({ name: user ? user.fullName : 'Невідомо', value: Math.round(kop / 100) })
  }
  return sortBy(rows, (row) => -row.value)
}

/** Закупівлі періоду за постачальниками (у гривнях); скасовані не враховуються. */
export function costBySupplier(db: Db, range: DateRange): NamedValue[] {
  const bySupplier = new Map<string, number>()
  for (const purchase of db.purchases) {
    if (purchase.cancelled || !inRange(purchase.date, range)) continue
    const supplier = db.suppliers.find((item) => item.id === purchase.supplierId)
    const name = supplier ? supplier.name : '—'
    const total = Math.round(sum(purchase.items.map((item) => item.qty * item.unitPriceKop)))
    bySupplier.set(name, (bySupplier.get(name) ?? 0) + total)
  }
  const rows: NamedValue[] = []
  for (const [name, kop] of bySupplier) rows.push({ name, value: Math.round(kop / 100) })
  return sortBy(rows, (row) => -row.value)
}
