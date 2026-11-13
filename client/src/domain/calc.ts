import { sortBy, sum } from '@/lib/utils'
import { isOrderLocked, orderStatusCode } from './labels'
import type {
  Allocation,
  AllocationLine,
  Batch,
  Db,
  Product,
  Purchase,
  PurchaseItem,
  PurchaseStatus,
} from './types'

export function roundQty(qty: number): number {
  return Math.round(qty * 1000) / 1000
}

/* ─── FIFO ─────────────────────────────────────────────────────────── */

export interface FifoPlan {
  lines: AllocationLine[]
  totalKop: number
  /** Скільки кількості не вистачило на складі. 0, якщо все покрито. */
  shortfall: number
}

/** Партії товару із залишком, у порядку FIFO (найстаріші спочатку). */
export function fifoBatches(db: Db, productId: string): Batch[] {
  const available = db.batches.filter((batch) => batch.productId === productId && batch.qtyRemaining > 0)
  return sortBy(available, (batch) => `${batch.receivedAt}|${batch.id}`)
}

/**
 * Планує списання за FIFO: найстаріші партії витрачаються першими.
 * Якщо кількість перекриває кілька партій, повертає кілька рядків,
 * кожен зі своєю ціною партії.
 */
export function planFifo(batches: Batch[], qty: number): FifoPlan {
  const lines: AllocationLine[] = []
  let left = roundQty(qty)
  let totalKop = 0

  for (const batch of batches) {
    if (left <= 0) break
    const take = roundQty(Math.min(batch.qtyRemaining, left))
    if (take <= 0) continue
    const lineKop = Math.round(take * batch.unitPriceKop)
    lines.push({ batchId: batch.id, qty: take, unitPriceKop: batch.unitPriceKop })
    totalKop += lineKop
    left = roundQty(left - take)
  }

  return { lines, totalKop, shortfall: left > 0 ? left : 0 }
}

/* ─── Склад ────────────────────────────────────────────────────────── */

export interface StockInfo {
  qty: number
  valueKop: number
  /** Середня ціна залишку; якщо залишку немає — середня за всю історію. */
  avgPriceKop: number
  batches: Batch[]
  inStock: boolean
}

export function productStock(db: Db, productId: string): StockInfo {
  const batches = fifoBatches(db, productId)
  const qty = roundQty(sum(batches.map((batch) => batch.qtyRemaining)))
  const valueKop = Math.round(sum(batches.map((batch) => batch.qtyRemaining * batch.unitPriceKop)))

  let avgPriceKop = 0
  if (qty > 0) {
    avgPriceKop = Math.round(valueKop / qty)
  } else {
    const all = db.batches.filter((batch) => batch.productId === productId)
    const receivedQty = roundQty(sum(all.map((batch) => batch.qtyReceived)))
    if (receivedQty > 0) {
      avgPriceKop = Math.round(sum(all.map((batch) => batch.qtyReceived * batch.unitPriceKop)) / receivedQty)
    }
  }

  return { qty, valueKop, avgPriceKop, batches, inStock: qty > 0 }
}

/** Загальна вартість залишків на складі станом на зараз. */
export function totalStockValueKop(db: Db): number {
  return Math.round(sum(db.batches.map((batch) => batch.qtyRemaining * batch.unitPriceKop)))
}

/* ─── Заявки ───────────────────────────────────────────────────────── */

export function orderAllocations(db: Db, orderId: string): Allocation[] {
  const items = db.allocations.filter((item) => item.orderId === orderId && item.status === 'active')
  return sortBy(items, (item) => item.createdAt).reverse()
}

export function orderAllocationHistory(db: Db, orderId: string): Allocation[] {
  const items = db.allocations.filter((item) => item.orderId === orderId)
  return sortBy(items, (item) => item.createdAt).reverse()
}

/** Собівартість заявки — сума її активних вкладень за цінами на момент операцій. */
export function orderCostKop(db: Db, orderId: string): number {
  return sum(orderAllocations(db, orderId).map((item) => item.totalKop))
}

export function orderLastOperationAt(db: Db, orderId: string): string | null {
  const items = db.allocations.filter((item) => item.orderId === orderId)
  if (items.length === 0) return null
  return sortBy(items, (item) => item.createdAt)[items.length - 1].createdAt
}

export interface CategorySlice {
  categoryId: string
  name: string
  kop: number
}

export function orderCostByCategory(db: Db, orderId: string): CategorySlice[] {
  const byCategory = new Map<string, number>()
  for (const allocation of orderAllocations(db, orderId)) {
    const product = db.products.find((item) => item.id === allocation.productId)
    if (!product) continue
    byCategory.set(product.categoryId, (byCategory.get(product.categoryId) ?? 0) + allocation.totalKop)
  }
  const slices: CategorySlice[] = []
  for (const [categoryId, kop] of byCategory) {
    const category = db.categories.find((item) => item.id === categoryId)
    slices.push({ categoryId, name: category ? category.name : 'Без категорії', kop })
  }
  return sortBy(slices, (slice) => -slice.kop)
}

export function canEditAllocations(db: Db, rawStatus: string, hasEditClosed: boolean, hasCreate: boolean): boolean {
  if (isOrderLocked(db, rawStatus)) return hasEditClosed
  return hasCreate
}

/* ─── Закупівлі ────────────────────────────────────────────────────── */

export function purchaseTotalKop(purchase: Purchase): number {
  return Math.round(sum(purchase.items.map((item) => item.qty * item.unitPriceKop)))
}

export function purchaseItemTotalKop(item: PurchaseItem): number {
  return Math.round(item.qty * item.unitPriceKop)
}

export function purchaseBatches(db: Db, purchaseId: string): Batch[] {
  return db.batches.filter((batch) => batch.purchaseId === purchaseId)
}

export function itemBatch(db: Db, purchaseItemId: string): Batch | undefined {
  return db.batches.find((batch) => batch.purchaseItemId === purchaseItemId)
}

export function purchaseAllocatedKop(db: Db, purchase: Purchase): number {
  let total = 0
  for (const batch of purchaseBatches(db, purchase.id)) {
    const consumed = roundQty(batch.qtyReceived - batch.qtyRemaining)
    total += consumed * batch.unitPriceKop
  }
  return Math.round(total)
}

export function purchaseUnallocatedKop(db: Db, purchase: Purchase): number {
  let total = 0
  for (const batch of purchaseBatches(db, purchase.id)) {
    total += batch.qtyRemaining * batch.unitPriceKop
  }
  return Math.round(total)
}

export function purchaseStatus(db: Db, purchase: Purchase): PurchaseStatus {
  if (purchase.cancelled) return 'cancelled'
  const batches = purchaseBatches(db, purchase.id)
  if (batches.length === 0) return 'new'
  const received = sum(batches.map((batch) => batch.qtyReceived))
  const remaining = sum(batches.map((batch) => batch.qtyRemaining))
  if (remaining <= 0) return 'full'
  if (remaining < received) return 'partial'
  return 'new'
}

/** Чи можна скасувати закупівлю: не можна, якщо з неї вже щось списали. */
export function canCancelPurchase(db: Db, purchase: Purchase): boolean {
  if (purchase.cancelled) return false
  const batches = purchaseBatches(db, purchase.id)
  return batches.every((batch) => batch.qtyRemaining >= batch.qtyReceived)
}

/* ─── Нерозподілені закупівлі ──────────────────────────────────────── */

export interface UnallocatedRow {
  purchase: Purchase
  item: PurchaseItem
  batch: Batch
  product: Product | undefined
  supplierName: string
  totalQty: number
  allocatedQty: number
  availableQty: number
  totalKop: number
  unallocatedKop: number
}

export function unallocatedRows(db: Db): UnallocatedRow[] {
  const rows: UnallocatedRow[] = []
  for (const purchase of db.purchases) {
    if (purchase.cancelled) continue
    for (const item of purchase.items) {
      const batch = itemBatch(db, item.id)
      if (!batch || batch.qtyRemaining <= 0) continue
      const supplier = db.suppliers.find((candidate) => candidate.id === purchase.supplierId)
      rows.push({
        purchase,
        item,
        batch,
        product: db.products.find((candidate) => candidate.id === item.productId),
        supplierName: supplier ? supplier.name : '—',
        totalQty: batch.qtyReceived,
        allocatedQty: roundQty(batch.qtyReceived - batch.qtyRemaining),
        availableQty: batch.qtyRemaining,
        totalKop: Math.round(batch.qtyReceived * batch.unitPriceKop),
        unallocatedKop: Math.round(batch.qtyRemaining * batch.unitPriceKop),
      })
    }
  }
  return sortBy(rows, (row) => row.purchase.date).reverse()
}

/* ─── Періоди ──────────────────────────────────────────────────────── */

export type PeriodKey = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom'

export interface DateRange {
  from: string
  to: string
}

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: 'Сьогодні',
  week: 'Тиждень',
  month: 'Місяць',
  year: 'Рік',
  all: 'Весь час',
  custom: 'Власний період',
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function endOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

export function rangeFor(period: PeriodKey, custom?: DateRange): DateRange {
  const now = new Date()
  const to = endOfDay(now).toISOString()

  if (period === 'custom' && custom) {
    return {
      from: startOfDay(new Date(custom.from)).toISOString(),
      to: endOfDay(new Date(custom.to)).toISOString(),
    }
  }

  if (period === 'today') return { from: startOfDay(now).toISOString(), to }

  if (period === 'week') {
    const from = startOfDay(now)
    from.setDate(from.getDate() - 6)
    return { from: from.toISOString(), to }
  }

  if (period === 'month') {
    const from = startOfDay(now)
    from.setDate(from.getDate() - 29)
    return { from: from.toISOString(), to }
  }

  if (period === 'year') {
    const from = startOfDay(now)
    from.setMonth(from.getMonth() - 11)
    from.setDate(1)
    return { from: from.toISOString(), to }
  }

  return { from: new Date(2000, 0, 1).toISOString(), to }
}

export function inRange(iso: string, range: DateRange): boolean {
  return iso >= range.from && iso <= range.to
}

export function rangeDays(range: DateRange): number {
  const ms = new Date(range.to).getTime() - new Date(range.from).getTime()
  return Math.max(1, Math.round(ms / 86_400_000))
}

/* ─── Показники головної ───────────────────────────────────────────── */

export interface DashboardMetrics {
  purchasesKop: number
  allocatedKop: number
  unallocatedInPeriodKop: number
  stockValueKop: number
  activeOrdersWithAllocations: number
  operationsCount: number
}

export function dashboardMetrics(db: Db, range: DateRange): DashboardMetrics {
  const purchases = db.purchases.filter((item) => !item.cancelled && inRange(item.date, range))
  const allocations = db.allocations.filter(
    (item) => item.status === 'active' && inRange(item.createdAt, range),
  )

  const activeOrders = db.orders.filter((order) => {
    const code = orderStatusCode(db, order.rawStatus)
    if (code === 'done' || code === 'closed') return false
    return orderAllocations(db, order.id).length > 0
  })

  return {
    purchasesKop: sum(purchases.map((item) => purchaseTotalKop(item))),
    allocatedKop: sum(allocations.map((item) => item.totalKop)),
    unallocatedInPeriodKop: sum(purchases.map((item) => purchaseUnallocatedKop(db, item))),
    stockValueKop: totalStockValueKop(db),
    activeOrdersWithAllocations: activeOrders.length,
    operationsCount: db.audit.filter((item) => inRange(item.at, range)).length,
  }
}

/* ─── Серії для графіків ───────────────────────────────────────────── */

export interface SeriesPoint {
  label: string
  purchases: number
  allocations: number
}

function bucketKey(iso: string, byMonth: boolean): string {
  const date = new Date(iso)
  if (byMonth) return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function bucketLabel(key: string, byMonth: boolean): string {
  const parts = key.split('-')
  if (byMonth) {
    const months = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру']
    return `${months[Number(parts[1]) - 1]} ${parts[0].slice(2)}`
  }
  return `${parts[2]}.${parts[1]}`
}

/** Закупівлі та вкладення по періодах. Дні — для діапазону до 31 дня, далі місяці. */
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

  // Заповнюємо порожні кошики, щоб лінія не рвалася.
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

export interface NamedValue {
  name: string
  value: number
}

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

export function allocatedVsUnallocated(db: Db, range: DateRange): NamedValue[] {
  const purchases = db.purchases.filter((item) => !item.cancelled && inRange(item.date, range))
  const allocated = sum(purchases.map((item) => purchaseAllocatedKop(db, item)))
  const unallocated = sum(purchases.map((item) => purchaseUnallocatedKop(db, item)))
  return [
    { name: 'Розподілено', value: Math.round(allocated / 100) },
    { name: 'Нерозподілено', value: Math.round(unallocated / 100) },
  ]
}

/* ─── Аналітика собівартості ───────────────────────────────────────── */

export interface AnalyticsFilters {
  range: DateRange
  userId: string
  categoryId: string
  supplierId: string
  assetType: string
  status: string
}

export const EMPTY_FILTER = 'all'

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
        const batchIds = allocation.lines.map((line) => line.batchId)
        const matches = batchIds.some((batchId) => {
          const batch = db.batches.find((item) => item.id === batchId)
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

export interface CostStats {
  count: number
  totalKop: number
  avgKop: number
  minKop: number
  maxKop: number
}

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

export function costBySupplier(db: Db, range: DateRange): NamedValue[] {
  const bySupplier = new Map<string, number>()
  for (const purchase of db.purchases) {
    if (purchase.cancelled || !inRange(purchase.date, range)) continue
    const supplier = db.suppliers.find((item) => item.id === purchase.supplierId)
    const name = supplier ? supplier.name : '—'
    bySupplier.set(name, (bySupplier.get(name) ?? 0) + purchaseTotalKop(purchase))
  }
  const rows: NamedValue[] = []
  for (const [name, kop] of bySupplier) rows.push({ name, value: Math.round(kop / 100) })
  return sortBy(rows, (row) => -row.value)
}
