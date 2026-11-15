/**
 * Складські залишки.
 *
 * Залишок товару — це сума залишків його партій. Окремої «нерозподіленої»
 * ціни не існує: нерозподілене і «на складі» — те саме, а вартість залишку
 * рахується як залишок × ціна кожної партії.
 */

import type { Batch } from '@/api/contract/types'
import { fifoBatches } from './fifo'
import { roundQty } from './money'
import type { Db } from './types'
import { sum } from './util'

export interface StockInfo {
  qty: number
  valueKop: number
  /** Середня ціна залишку; якщо залишку немає — середня за всю історію. */
  avgPriceKop: number
  /** Партії із залишком у порядку FIFO. */
  batches: Batch[]
  inStock: boolean
}

/** Залишок, вартість і середня ціна одного товару. */
export function productStock(db: Db, productId: string): StockInfo {
  const batches = fifoBatches(db, productId)
  const qty = roundQty(sum(batches.map((batch) => batch.qtyRemaining)))
  const valueKop = Math.round(sum(batches.map((batch) => batch.qtyRemaining * batch.unitPriceKop)))

  let avgPriceKop = 0
  if (qty > 0) {
    avgPriceKop = Math.round(valueKop / qty)
  } else {
    // Залишку немає: щоб на картці товару лишалась орієнтовна ціна,
    // беремо середню за всіма надходженнями.
    const all = db.batches.filter((batch) => batch.productId === productId)
    const receivedQty = roundQty(sum(all.map((batch) => batch.qtyReceived)))
    if (receivedQty > 0) {
      avgPriceKop = Math.round(sum(all.map((batch) => batch.qtyReceived * batch.unitPriceKop)) / receivedQty)
    }
  }

  return { qty, valueKop, avgPriceKop, batches, inStock: qty > 0 }
}

/** Загальна вартість залишків усього складу зараз. */
export function totalStockValueKop(db: Db): number {
  return Math.round(sum(db.batches.map((batch) => batch.qtyRemaining * batch.unitPriceKop)))
}
