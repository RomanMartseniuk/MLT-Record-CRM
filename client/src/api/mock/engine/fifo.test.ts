import { describe, expect, test } from 'vitest'
import { fifoBatches, planFifo } from './fifo'
import { makeBatch, makeDb } from './test-utils'

describe('planFifo', () => {
  test('one batch covers the requested quantity', () => {
    const plan = planFifo([makeBatch({ id: 'b1', qtyRemaining: 10, unitPriceKop: 1000 })], 4)

    expect(plan.lines).toEqual([{ batchId: 'b1', qty: 4, unitPriceKop: 1000 }])
    expect(plan.totalKop).toBe(4000)
    expect(plan.shortfall).toBe(0)
  })

  test('a quantity spanning two batches gives one line per batch at its own price', () => {
    const plan = planFifo(
      [
        makeBatch({ id: 'b1', qtyRemaining: 3, unitPriceKop: 1000 }),
        makeBatch({ id: 'b2', qtyRemaining: 5, unitPriceKop: 1200 }),
      ],
      5,
    )

    expect(plan.lines).toEqual([
      { batchId: 'b1', qty: 3, unitPriceKop: 1000 },
      { batchId: 'b2', qty: 2, unitPriceKop: 1200 },
    ])
    expect(plan.totalKop).toBe(3 * 1000 + 2 * 1200)
    expect(plan.shortfall).toBe(0)
  })

  test('batches with the same price still produce separate lines', () => {
    const plan = planFifo(
      [
        makeBatch({ id: 'b1', qtyRemaining: 2, unitPriceKop: 500 }),
        makeBatch({ id: 'b2', qtyRemaining: 2, unitPriceKop: 500 }),
      ],
      3,
    )

    expect(plan.lines.map((line) => line.batchId)).toEqual(['b1', 'b2'])
    expect(plan.totalKop).toBe(1500)
  })

  test('a batch with nothing left is skipped', () => {
    const plan = planFifo(
      [
        makeBatch({ id: 'b1', qtyRemaining: 0, unitPriceKop: 1000 }),
        makeBatch({ id: 'b2', qtyRemaining: 5, unitPriceKop: 1200 }),
      ],
      2,
    )

    expect(plan.lines).toEqual([{ batchId: 'b2', qty: 2, unitPriceKop: 1200 }])
  })

  test('a shortage covers what exists and reports the rest as shortfall', () => {
    const plan = planFifo([makeBatch({ id: 'b1', qtyRemaining: 3, unitPriceKop: 1000 })], 5)

    expect(plan.lines).toEqual([{ batchId: 'b1', qty: 3, unitPriceKop: 1000 }])
    expect(plan.totalKop).toBe(3000)
    expect(plan.shortfall).toBe(2)
  })

  test('0.1 + 0.2 is written off completely, without a rounding leftover', () => {
    const plan = planFifo(
      [
        makeBatch({ id: 'b1', qtyRemaining: 0.1, unitPriceKop: 1000 }),
        makeBatch({ id: 'b2', qtyRemaining: 0.2, unitPriceKop: 1000 }),
      ],
      0.3,
    )

    expect(plan.shortfall).toBe(0)
    expect(plan.lines.map((line) => line.qty)).toEqual([0.1, 0.2])
    expect(plan.totalKop).toBe(300)
  })
})

describe('fifoBatches', () => {
  test('returns only batches of the product that still have stock, oldest first, ties by id', () => {
    const db = makeDb({
      batches: [
        makeBatch({ id: 'b3', receivedAt: '2026-02-01T00:00:00.000Z' }),
        makeBatch({ id: 'b2', receivedAt: '2026-01-01T00:00:00.000Z' }),
        makeBatch({ id: 'b1', receivedAt: '2026-01-01T00:00:00.000Z' }),
        makeBatch({ id: 'empty', qtyRemaining: 0, receivedAt: '2025-01-01T00:00:00.000Z' }),
        makeBatch({ id: 'other', productId: 'p2', receivedAt: '2025-01-01T00:00:00.000Z' }),
      ],
    })

    expect(fifoBatches(db, 'p1').map((batch) => batch.id)).toEqual(['b1', 'b2', 'b3'])
  })
})
