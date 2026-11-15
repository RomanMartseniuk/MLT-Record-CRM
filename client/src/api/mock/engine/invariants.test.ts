/**
 * Property-style tests of the accounting invariants.
 *
 * A long, reproducible random sequence of operations is run on the demo
 * database. After EVERY step the invariants of docs/03-backend-plan.md are
 * checked. This is the safety net of the whole refactoring and the executable
 * specification the real server must satisfy too.
 */

import { afterEach, describe, expect, test, vi } from 'vitest'
import { createSeededDb } from '../seed'
import { assertInvariants } from './assert-invariants'
import { adjustStock } from './adjust'
import { addAllocation, releaseAllocation, transferAllocation } from './allocations'
import { cancelPurchase, createPurchase } from './purchases'
import { isOrderLocked } from './status'
import { productStock } from './stock'
import type { Db } from './types'

/** Small deterministic random number generator (the same seed gives the same run). */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('demo database', () => {
  test('satisfies every accounting invariant', () => {
    assertInvariants(createSeededDb())
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** Runs `operation` on a copy and keeps it only if it succeeded, like the real storage does. */
function commitIfOk(db: Db, operation: (draft: Db) => { ok: boolean }): Db {
  const draft = structuredClone(db)
  return operation(draft).ok ? draft : db
}

describe('a long random sequence of operations', () => {
  test.each([1, 2, 3])('keeps all invariants after every step (seed %i)', (seed) => {
    const random = mulberry32(seed)
    // Ids are generated with Math.random: make them reproducible too.
    vi.spyOn(Math, 'random').mockImplementation(random)

    let db = createSeededDb()
    const pick = <T,>(items: T[]): T => items[Math.floor(random() * items.length)]
    const userId = 'u_admin'

    // What must never change after it was written.
    const batchPrices = new Map(db.batches.map((batch) => [batch.id, batch.unitPriceKop]))
    const allocationTotals = new Map(db.allocations.map((allocation) => [allocation.id, allocation.totalKop]))
    let allocationCount = db.allocations.length
    let auditCount = db.audit.length

    for (let step = 0; step < 300; step++) {
      const kind = Math.floor(random() * 7)
      const product = pick(db.products)
      const order = pick(db.orders)
      const active = db.allocations.filter((allocation) => allocation.status === 'active')
      const stockQty = productStock(db, product.id).qty

      if (kind === 0) {
        // Purchase into the warehouse.
        db = commitIfOk(db, (draft) =>
          createPurchase(
            draft,
            {
              supplierId: pick(db.suppliers).id,
              destination: 'warehouse',
              items: [{ productId: product.id, qty: 1 + Math.floor(random() * 8), unitPriceKop: 100 + Math.floor(random() * 50000) }],
            },
            userId,
          ),
        )
      } else if (kind === 1) {
        // Purchase straight into an order (refused for an issued one).
        db = commitIfOk(db, (draft) =>
          createPurchase(
            draft,
            {
              supplierId: pick(db.suppliers).id,
              destination: 'order',
              orderId: order.id,
              items: [{ productId: product.id, qty: 1 + Math.floor(random() * 3), unitPriceKop: 100 + Math.floor(random() * 50000) }],
            },
            userId,
          ),
        )
      } else if (kind === 2) {
        // Allocation; sometimes more than is in stock (must be refused), with a reason for issued orders.
        const qty = Math.round((0.25 + random() * (stockQty + 1)) * 4) / 4
        db = commitIfOk(db, (draft) =>
          addAllocation(draft, { orderId: order.id, productId: product.id, qty, reason: isOrderLocked(db, order.rawStatus) ? 'test' : undefined }, userId),
        )
      } else if (kind === 3 && active.length > 0) {
        const allocation = pick(active)
        db = commitIfOk(db, (draft) =>
          releaseAllocation(draft, allocation.id, random() < 0.5 ? 'returned' : 'cancelled', userId, 'test'),
        )
      } else if (kind === 4 && active.length > 0) {
        const allocation = pick(active)
        db = commitIfOk(db, (draft) => transferAllocation(draft, allocation.id, order.id, userId, 'test'))
      } else if (kind === 5) {
        // Adjustment up or down; down beyond the stock must be refused.
        const delta = Math.round((random() * 6 - 3) * 4) / 4
        db = commitIfOk(db, (draft) => adjustStock(draft, product.id, delta, 'test', userId))
      } else if (kind === 6) {
        const open = db.purchases.filter((purchase) => !purchase.cancelled)
        if (open.length > 0) {
          const purchase = pick(open)
          db = commitIfOk(db, (draft) => cancelPurchase(draft, purchase.id, 'test', userId))
        }
      }

      assertInvariants(db)

      // Prices of batches and totals of allocations are fixed once written.
      for (const batch of db.batches) {
        const known = batchPrices.get(batch.id)
        if (known === undefined) batchPrices.set(batch.id, batch.unitPriceKop)
        else expect(batch.unitPriceKop, `price of batch ${batch.id}`).toBe(known)
      }
      for (const allocation of db.allocations) {
        const known = allocationTotals.get(allocation.id)
        if (known === undefined) allocationTotals.set(allocation.id, allocation.totalKop)
        else expect(allocation.totalKop, `total of allocation ${allocation.id}`).toBe(known)
      }

      // Financial records are never deleted: only more of them appear.
      expect(db.allocations.length).toBeGreaterThanOrEqual(allocationCount)
      expect(db.audit.length).toBeGreaterThanOrEqual(auditCount)
      allocationCount = db.allocations.length
      auditCount = db.audit.length
    }
  })
})
