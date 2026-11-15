/**
 * Закупівлі.
 *
 * Закупівля створює партії товару з конкретною ціною. Закупівля — це НЕ
 * витрата: гроші стають витратою лише тоді, коли товар вкладено в заявку.
 * Тому суми закупівель і вкладень ніколи не додаються.
 *
 * Два призначення закупівлі:
 * - `warehouse` — партії йдуть на склад (значення за замовчуванням);
 * - `order` — закупівля одразу вкладається в заявку, у залишок складу така
 *   позиція не потрапляє. Створюється лише з діалогу вкладення в заявці.
 *
 * Закупівлі не видаляються, їх можна тільки скасувати.
 */

import type { CreatePurchaseInput, CreatePurchaseResult, PurchaseItemInput } from '@/api/contract/dto'
import type { ApiResult } from '@/api/contract/result'
import type { Allocation, Batch, Purchase, PurchaseItem, PurchaseStatus } from '@/api/contract/types'
import { pushAudit } from './audit'
import { now } from './dates'
import { formatMoney } from './format'
import { roundQty } from './money'
import { fail, ok } from './result'
import { isOrderLocked } from './status'
import type { Db } from './types'
import { sum, uid } from './util'

/* ─── Розрахунки ───────────────────────────────────────────────────── */

/** Сума закупівлі: кількість × ціна по всіх позиціях, округлена до копійок. */
export function purchaseTotalKop(purchase: Purchase): number {
  return Math.round(sum(purchase.items.map((item) => item.qty * item.unitPriceKop)))
}

/** Сума однієї позиції закупівлі. */
export function purchaseItemTotalKop(item: PurchaseItem): number {
  return Math.round(item.qty * item.unitPriceKop)
}

/** Партії, які створила закупівля. */
export function purchaseBatches(db: Db, purchaseId: string): Batch[] {
  return db.batches.filter((batch) => batch.purchaseId === purchaseId)
}

/** Партія конкретної позиції закупівлі. */
export function itemBatch(db: Db, purchaseItemId: string): Batch | undefined {
  return db.batches.find((batch) => batch.purchaseItemId === purchaseItemId)
}

/** Скільки з закупівлі вже вкладено в заявки (за цінами її партій). */
export function purchaseAllocatedKop(db: Db, purchase: Purchase): number {
  let total = 0
  for (const batch of purchaseBatches(db, purchase.id)) {
    const consumed = roundQty(batch.qtyReceived - batch.qtyRemaining)
    total += consumed * batch.unitPriceKop
  }
  return Math.round(total)
}

/** Скільки з закупівлі ще лежить на складі (залишок її партій × ціна). */
export function purchaseRemainingKop(db: Db, purchase: Purchase): number {
  let total = 0
  for (const batch of purchaseBatches(db, purchase.id)) {
    total += batch.qtyRemaining * batch.unitPriceKop
  }
  return Math.round(total)
}

/**
 * Статус закупівлі виводиться з її партій, окремо не зберігається:
 * нова (нічого не списано), частково розподілена, повністю розподілена, скасована.
 */
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

/* ─── Операції ─────────────────────────────────────────────────────── */

/**
 * Вхід `createPurchase`: усі позиції вже мають існуючий товар.
 * Контрактний `CreatePurchaseInput` дозволяє ще й позиції з новим товаром;
 * їх перетворює на звичайні шар обробників (спершу створює товар у тій самій
 * зміні даних), тож сам рушій знає лише про `productId`.
 */
export interface ResolvedPurchaseInput extends Omit<CreatePurchaseInput, 'items'> {
  items: PurchaseItemInput[]
}

/**
 * Створює закупівлю.
 *
 * Для кожної позиції з'являється партія з ціною цієї позиції. Якщо
 * призначення «у заявку», партія одразу обнуляється, а замість неї
 * створюється вкладення в заявку за тією самою ціною.
 */
export function createPurchase(
  db: Db,
  input: ResolvedPurchaseInput,
  userId: string,
): ApiResult<CreatePurchaseResult> {
  if (input.items.length === 0) return fail('Додайте хоча б одну позицію закупівлі.')
  if (!input.supplierId) return fail('Виберіть постачальника.')
  if (input.destination === 'order' && !input.orderId) return fail('Виберіть заявку для закупівлі.')

  for (const item of input.items) {
    if (!item.productId) return fail('У кожній позиції має бути вибраний товар.')
    if (!(item.qty > 0)) return fail('Кількість у позиції має бути більшою за нуль.')
    if (!(item.unitPriceKop > 0)) return fail('Ціна за одиницю має бути більшою за нуль.')
  }

  const order = input.orderId ? db.orders.find((candidate) => candidate.id === input.orderId) : undefined
  if (input.destination === 'order') {
    if (!order) return fail('Заявку не знайдено.')
    // У видану заявку напряму закупити не можна: її вкладення заблоковані.
    if (isOrderLocked(db, order.rawStatus)) {
      return fail('Заявка закрита: закупівлю напряму в неї оформити не можна.')
    }
  }

  // Усі перевірки пройдено: далі змінюємо дані.
  const at = input.date ?? now()
  db.counters.purchase += 1
  const purchaseId = uid('pur')

  const purchase: Purchase = {
    id: purchaseId,
    number: `З-${String(db.counters.purchase).padStart(4, '0')}`,
    date: at,
    supplierId: input.supplierId,
    docNumber: input.docNumber,
    comment: input.comment,
    hasReceipt: input.hasReceipt ?? false,
    destination: input.destination,
    orderId: input.destination === 'order' ? input.orderId : undefined,
    cancelled: false,
    createdById: userId,
    items: input.items.map((item) => ({
      id: uid('pit'),
      productId: item.productId,
      qty: roundQty(item.qty),
      unitPriceKop: item.unitPriceKop,
      note: item.note,
    })),
  }

  db.purchases.push(purchase)

  const allocationIds: string[] = []

  for (const item of purchase.items) {
    const batch: Batch = {
      id: uid('bat'),
      productId: item.productId,
      purchaseId,
      purchaseItemId: item.id,
      qtyReceived: item.qty,
      qtyRemaining: item.qty,
      unitPriceKop: item.unitPriceKop,
      receivedAt: at,
    }
    db.batches.push(batch)

    if (purchase.destination === 'order' && purchase.orderId) {
      // Товар одразу пішов у заявку, тому на складі від партії нічого не лишається.
      batch.qtyRemaining = 0
      const allocation: Allocation = {
        id: uid('alc'),
        orderId: purchase.orderId,
        productId: item.productId,
        qty: item.qty,
        lines: [{ batchId: batch.id, qty: item.qty, unitPriceKop: item.unitPriceKop }],
        totalKop: Math.round(item.qty * item.unitPriceKop),
        createdAt: at,
        createdById: userId,
        status: 'active',
      }
      db.allocations.push(allocation)
      allocationIds.push(allocation.id)
    }
  }

  pushAudit(
    db,
    {
      userId,
      action: 'purchase.create',
      objectType: 'Закупівля',
      objectId: purchaseId,
      objectLabel: purchase.number,
      after: `${purchase.items.length} поз., ${formatMoney(purchaseTotalKop(purchase))}, ${
        purchase.destination === 'order' ? 'у заявку' : 'на склад'
      }`,
    },
    at,
  )

  return ok({ purchaseId, allocationIds })
}

/**
 * Скасовує закупівлю. Не видаляє: фінансові записи не видаляються.
 * Дозволено лише якщо з її партій ще нічого не списано; причина обов'язкова.
 */
export function cancelPurchase(db: Db, purchaseId: string, reason: string, userId: string): ApiResult {
  const purchase = db.purchases.find((item) => item.id === purchaseId)
  if (!purchase) return fail('Закупівлю не знайдено.')
  if (purchase.cancelled) return fail('Закупівля вже скасована.')
  if (!reason.trim()) return fail('Вкажіть причину скасування.')

  const batches = purchaseBatches(db, purchaseId)
  const consumed = batches.some((batch) => batch.qtyRemaining < batch.qtyReceived)
  if (consumed) {
    return fail('З цієї закупівлі вже є вкладення. Спочатку поверніть їх на склад.')
  }

  purchase.cancelled = true
  purchase.cancelReason = reason.trim()
  // Скасована закупівля не повинна впливати на залишок складу.
  for (const batch of batches) batch.qtyRemaining = 0

  pushAudit(db, {
    userId,
    action: 'purchase.cancel',
    objectType: 'Закупівля',
    objectId: purchaseId,
    objectLabel: purchase.number,
    before: 'активна',
    after: 'скасована',
    reason: reason.trim(),
  })

  return ok(undefined)
}
