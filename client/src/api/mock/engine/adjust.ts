/**
 * Ручне коригування залишку складу.
 *
 * Це окрема облікова операція «Коригування», а не закупівля: плюс створює
 * власну партію без закупівлі (`adjustment: true`), мінус списує за FIFO.
 * Причина обов'язкова, запис іде в журнал.
 *
 * Негативні залишки заборонені БЕЗ ВИНЯТКІВ: навіть коригування не може
 * списати більше, ніж є на складі. Партія-коригування враховується у
 * звірці «закупівлі ↔ склад» окремим доданком (docs/02-spec.md, 4.7).
 */

import type { ApiResult } from '@/api/contract/result'
import { pushAudit } from './audit'
import { now } from './dates'
import { fifoBatches, planFifo } from './fifo'
import { formatQty } from './format'
import { roundQty } from './money'
import { fail, ok } from './result'
import { productStock } from './stock'
import type { Db } from './types'
import { uid } from './util'

/**
 * Змінює залишок товару на `deltaQty` (плюс додає, мінус списує).
 * Ціна партії-коригування — середня ціна залишку (0, якщо історії немає).
 */
export function adjustStock(
  db: Db,
  productId: string,
  deltaQty: number,
  reason: string,
  userId: string,
): ApiResult {
  const product = db.products.find((item) => item.id === productId)
  if (!product) return fail('Товар не знайдено.')
  if (!reason.trim()) return fail('Вкажіть причину коригування.')

  const delta = roundQty(deltaQty)
  if (delta === 0) return fail('Вкажіть кількість, відмінну від нуля.')

  const stock = productStock(db, productId)

  if (delta > 0) {
    // Нова партія без закупівлі: потрапляє на склад за середньою ціною залишку.
    const price = stock.avgPriceKop > 0 ? stock.avgPriceKop : 0
    db.batches.push({
      id: uid('bat'),
      productId,
      purchaseId: '',
      purchaseItemId: '',
      qtyReceived: delta,
      qtyRemaining: delta,
      unitPriceKop: price,
      receivedAt: now(),
      adjustment: true,
    })
  } else {
    const need = roundQty(-delta)
    if (need > stock.qty) {
      return fail('Відʼємні залишки заборонені: не можна списати більше, ніж є на складі.')
    }
    // Мінус списується так само, як вкладення: найстаріші партії першими.
    const plan = planFifo(fifoBatches(db, productId), need)
    for (const line of plan.lines) {
      const batch = db.batches.find((item) => item.id === line.batchId)
      if (!batch) continue
      batch.qtyRemaining = roundQty(batch.qtyRemaining - line.qty)
    }
  }

  const after = productStock(db, productId)
  pushAudit(db, {
    userId,
    action: 'inventory.adjust',
    objectType: 'Залишок',
    objectId: productId,
    objectLabel: product.name,
    before: formatQty(stock.qty, product.unit),
    after: formatQty(after.qty, product.unit),
    reason: reason.trim(),
  })

  return ok(undefined)
}
