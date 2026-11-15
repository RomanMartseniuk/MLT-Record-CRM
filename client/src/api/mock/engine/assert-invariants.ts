/**
 * Test helper: asserts the accounting invariants of docs/03-backend-plan.md
 * on a database. Used by the random-sequence test and by the seed test; it
 * lives in its own file so importing it does not re-run any test file.
 */

import { expect } from 'vitest'
import { roundQty } from './money'
import { totalStockValueKop } from './stock'
import type { Db } from './types'
import { sum } from './util'

/** Throws a descriptive error if any accounting invariant is broken. */
export function assertInvariants(db: Db): void {
  // 1. Stock never goes negative, and a batch never holds more than it received.
  for (const batch of db.batches) {
    expect(batch.qtyRemaining, `batch ${batch.id} remaining`).toBeGreaterThanOrEqual(0)
    expect(batch.qtyRemaining, `batch ${batch.id} remaining <= received`).toBeLessThanOrEqual(batch.qtyReceived)
  }

  // 2. Reconciliation: the stock of non-cancelled purchases plus the stock of
  //    adjustment batches (which belong to no purchase) equals the warehouse value.
  const cancelledIds = new Set(db.purchases.filter((purchase) => purchase.cancelled).map((purchase) => purchase.id))
  const counted = db.batches.filter(
    (batch) => batch.adjustment || (batch.purchaseId && !cancelledIds.has(batch.purchaseId)),
  )
  const reconciled = Math.round(sum(counted.map((batch) => batch.qtyRemaining * batch.unitPriceKop)))
  expect(reconciled, 'purchases + adjustments = warehouse value').toBe(totalStockValueKop(db))

  // 3. A cancelled purchase leaves nothing in stock.
  for (const batch of db.batches) {
    if (cancelledIds.has(batch.purchaseId)) expect(batch.qtyRemaining).toBe(0)
  }

  // 4. Every allocation is made of existing batches; its quantity and its total
  //    are exactly the sum of its lines (nothing is allocated that was not taken
  //    from a batch).
  for (const allocation of db.allocations) {
    const lineTotal = sum(allocation.lines.map((line) => Math.round(line.qty * line.unitPriceKop)))
    expect(allocation.totalKop, `allocation ${allocation.id} total`).toBe(lineTotal)
    expect(roundQty(sum(allocation.lines.map((line) => line.qty))), `allocation ${allocation.id} quantity`).toBe(
      allocation.qty,
    )
    for (const line of allocation.lines) {
      expect(
        db.batches.some((batch) => batch.id === line.batchId),
        `allocation ${allocation.id} batch exists`,
      ).toBe(true)
    }
  }
}
