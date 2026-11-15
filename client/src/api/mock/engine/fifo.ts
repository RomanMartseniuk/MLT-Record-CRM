/**
 * FIFO: списання зі складу «перші прийшли — перші пішли».
 *
 * Товар поступає партіями (кожна зі своєю ціною). При вкладенні в заявку
 * спершу витрачаються найстаріші партії. Якщо кількість охоплює кілька
 * партій, виходить кілька рядків списання, і кожен тримає ціну своєї
 * партії. Ціна партії після надходження ніколи не змінюється.
 */

import type { AllocationLine, Batch } from '@/api/contract/types'
import { roundQty } from './money'
import type { Db } from './types'
import { sortBy } from './util'

/** План списання, який ще нічого не змінює. */
export interface FifoPlan {
  lines: AllocationLine[]
  totalKop: number
  /** Скільки кількості не вистачило на складі. 0, якщо все покрито. */
  shortfall: number
}

/**
 * Партії товару із залишком у порядку FIFO.
 * Порядок: за датою надходження, при рівних датах — за ідентифікатором,
 * щоб результат був стабільним.
 */
export function fifoBatches(db: Db, productId: string): Batch[] {
  const available = db.batches.filter((batch) => batch.productId === productId && batch.qtyRemaining > 0)
  return sortBy(available, (batch) => `${batch.receivedAt}|${batch.id}`)
}

/**
 * Планує списання `qty` з переданих партій (вони вже мають бути у порядку FIFO).
 * Нічого не змінює: лише повертає, що саме і за якою ціною буде списано.
 * Якщо партій не вистачає, покриває те, що є, а решту вказує в `shortfall`.
 */
export function planFifo(batches: Batch[], qty: number): FifoPlan {
  const lines: AllocationLine[] = []
  let left = roundQty(qty)
  let totalKop = 0

  for (const batch of batches) {
    if (left <= 0) break
    const take = roundQty(Math.min(batch.qtyRemaining, left))
    if (take <= 0) continue
    // Сума рядка — ціле число копійок: округляємо добуток кількості на ціну.
    const lineKop = Math.round(take * batch.unitPriceKop)
    lines.push({ batchId: batch.id, qty: take, unitPriceKop: batch.unitPriceKop })
    totalKop += lineKop
    left = roundQty(left - take)
  }

  return { lines, totalKop, shortfall: left > 0 ? left : 0 }
}
