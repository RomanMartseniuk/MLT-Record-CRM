/**
 * Вкладення (allocations) матеріалів у заявки.
 *
 * Вкладення прив'язує товар зі складу до заявки. Ціна визначається
 * автоматично за FIFO, вручну її ніхто не вводить. Вкладення миттєво
 * зменшує залишок складу. Собівартість заявки — це сума її активних
 * вкладень за цінами на момент операцій.
 *
 * Кожна дія (додати, повернути, скасувати, перенести) — окрема облікова
 * операція з записом у журнал. Перенос і повернення не створюють нових
 * витрат і не збільшують суму закупівель. Заявка в статусі «Видано» вважається
 * закритою: будь-яка зміна вкладень там вимагає причини.
 */

import type { AddAllocationInput, CostSlice } from '@/api/contract/dto'
import type { ApiResult } from '@/api/contract/result'
import type { Allocation } from '@/api/contract/types'
import { pushAudit } from './audit'
import { now } from './dates'
import { fifoBatches, planFifo } from './fifo'
import { formatMoney, formatQty } from './format'
import { roundQty } from './money'
import { fail, ok } from './result'
import { isOrderLocked } from './status'
import { productStock } from './stock'
import type { Db } from './types'
import { sortBy, sum, uid } from './util'

/* ─── Запити по заявці ─────────────────────────────────────────────── */

/** Активні вкладення заявки, найновіші першими. */
export function orderAllocations(db: Db, orderId: string): Allocation[] {
  const items = db.allocations.filter((item) => item.orderId === orderId && item.status === 'active')
  return sortBy(items, (item) => item.createdAt).reverse()
}

/** Уся історія вкладень заявки (разом із поверненими й скасованими), найновіші першими. */
export function orderAllocationHistory(db: Db, orderId: string): Allocation[] {
  const items = db.allocations.filter((item) => item.orderId === orderId)
  return sortBy(items, (item) => item.createdAt).reverse()
}

/** Собівартість заявки: сума її активних вкладень за цінами на момент операцій. */
export function orderCostKop(db: Db, orderId: string): number {
  return sum(orderAllocations(db, orderId).map((item) => item.totalKop))
}

/** Час останньої операції по заявці або `null`, якщо вкладень ще не було. */
export function orderLastOperationAt(db: Db, orderId: string): string | null {
  const items = db.allocations.filter((item) => item.orderId === orderId)
  if (items.length === 0) return null
  return sortBy(items, (item) => item.createdAt)[items.length - 1].createdAt
}

/** Собівартість заявки по категоріях товарів, від більшої до меншої. */
export function orderCostByCategory(db: Db, orderId: string): CostSlice[] {
  const byCategory = new Map<string, number>()
  for (const allocation of orderAllocations(db, orderId)) {
    const product = db.products.find((item) => item.id === allocation.productId)
    if (!product) continue
    byCategory.set(product.categoryId, (byCategory.get(product.categoryId) ?? 0) + allocation.totalKop)
  }
  const slices: CostSlice[] = []
  for (const [categoryId, kop] of byCategory) {
    const category = db.categories.find((item) => item.id === categoryId)
    slices.push({ categoryId, name: category ? category.name : 'Без категорії', kop })
  }
  return sortBy(slices, (slice) => -slice.kop)
}

/* ─── Операції ─────────────────────────────────────────────────────── */

/** Вхідні дані вкладення плюс `at`: момент операції, потрібен лише сценарію демо-даних. */
export interface AddAllocationOptions extends AddAllocationInput {
  at?: string
}

/**
 * Додає вкладення: ціну рахує за FIFO, залишок списує одразу.
 * Для закритої заявки причина обов'язкова.
 */
export function addAllocation(db: Db, input: AddAllocationOptions, userId: string): ApiResult<Allocation> {
  const order = db.orders.find((item) => item.id === input.orderId)
  if (!order) return fail('Заявку не знайдено.')

  const product = db.products.find((item) => item.id === input.productId)
  if (!product) return fail('Товар не знайдено.')

  const qty = roundQty(input.qty)
  if (!(qty > 0)) return fail('Кількість має бути більшою за нуль.')

  const locked = isOrderLocked(db, order.rawStatus)
  const reason = input.reason?.trim()
  if (locked && !reason) return fail('Для закритої заявки потрібно вказати причину зміни.')

  // Негативний склад заборонено: вкладати більше, ніж є, не можна.
  const stock = productStock(db, input.productId)
  if (qty > stock.qty) {
    return fail(
      `На складі доступно лише ${formatQty(stock.qty, product.unit)}. Оформіть закупівлю, щоб поповнити залишок.`,
    )
  }

  const plan = planFifo(fifoBatches(db, input.productId), qty)
  if (plan.shortfall > 0) return fail('Недостатньо залишку на складі.')

  for (const line of plan.lines) {
    const batch = db.batches.find((item) => item.id === line.batchId)
    if (!batch) return fail('Партію не знайдено.')
    batch.qtyRemaining = roundQty(batch.qtyRemaining - line.qty)
  }

  const at = input.at ?? now()
  const allocation: Allocation = {
    id: uid('alc'),
    orderId: input.orderId,
    productId: input.productId,
    qty,
    lines: plan.lines,
    totalKop: plan.totalKop,
    createdAt: at,
    createdById: userId,
    status: 'active',
    reason,
  }
  db.allocations.push(allocation)

  pushAudit(
    db,
    {
      userId,
      action: 'allocation.create',
      objectType: 'Вкладення',
      objectId: allocation.id,
      objectLabel: `${product.name} → ${order.number}`,
      after: `${formatQty(qty, product.unit)}, ${formatMoney(plan.totalKop)}`,
      reason,
    },
    at,
  )

  return ok(allocation)
}

/**
 * Повертає вкладення на склад (`returned`) або скасовує помилкове (`cancelled`).
 * В обох випадках кількість і вартість повертаються саме в ті партії, з яких
 * були взяті, за їхніми цінами.
 */
export function releaseAllocation(
  db: Db,
  allocationId: string,
  mode: 'returned' | 'cancelled',
  userId: string,
  reason?: string,
): ApiResult {
  const allocation = db.allocations.find((item) => item.id === allocationId)
  if (!allocation) return fail('Вкладення не знайдено.')
  if (allocation.status !== 'active') return fail('Це вкладення вже не активне.')

  const order = db.orders.find((item) => item.id === allocation.orderId)
  if (!order) return fail('Заявку не знайдено.')

  const trimmed = reason?.trim()
  if (isOrderLocked(db, order.rawStatus) && !trimmed) {
    return fail('Для закритої заявки потрібно вказати причину зміни.')
  }

  for (const line of allocation.lines) {
    const batch = db.batches.find((item) => item.id === line.batchId)
    if (!batch) continue
    batch.qtyRemaining = roundQty(batch.qtyRemaining + line.qty)
  }

  allocation.status = mode
  allocation.reason = trimmed ?? allocation.reason

  const product = db.products.find((item) => item.id === allocation.productId)
  pushAudit(db, {
    userId,
    action: mode === 'returned' ? 'allocation.return' : 'allocation.cancel',
    objectType: 'Вкладення',
    objectId: allocation.id,
    objectLabel: `${product ? product.name : 'Товар'} → ${order.number}`,
    before: `активне, ${formatMoney(allocation.totalKop)}`,
    after: mode === 'returned' ? 'повернуто на склад' : 'скасовано',
    reason: trimmed,
  })

  return ok(undefined)
}

/**
 * Переносить вкладення на іншу заявку.
 * Склад не змінюється, ціни зберігаються, тож загальна сума закупівель не
 * росте. Якщо одна із заявок закрита, причина обов'язкова.
 */
export function transferAllocation(
  db: Db,
  allocationId: string,
  toOrderId: string,
  userId: string,
  reason?: string,
): ApiResult {
  const allocation = db.allocations.find((item) => item.id === allocationId)
  if (!allocation) return fail('Вкладення не знайдено.')
  if (allocation.status !== 'active') return fail('Це вкладення вже не активне.')
  if (allocation.orderId === toOrderId) return fail('Це та сама заявка.')

  const from = db.orders.find((item) => item.id === allocation.orderId)
  const to = db.orders.find((item) => item.id === toOrderId)
  if (!from || !to) return fail('Заявку не знайдено.')

  const trimmed = reason?.trim()
  if ((isOrderLocked(db, from.rawStatus) || isOrderLocked(db, to.rawStatus)) && !trimmed) {
    return fail('Для закритої заявки потрібно вказати причину зміни.')
  }

  allocation.transferredFromOrderId = allocation.orderId
  allocation.orderId = toOrderId
  allocation.reason = trimmed ?? allocation.reason

  const product = db.products.find((item) => item.id === allocation.productId)
  pushAudit(db, {
    userId,
    action: 'allocation.transfer',
    objectType: 'Вкладення',
    objectId: allocation.id,
    objectLabel: product ? product.name : 'Товар',
    before: from.number,
    after: to.number,
    reason: trimmed,
  })

  return ok(undefined)
}
