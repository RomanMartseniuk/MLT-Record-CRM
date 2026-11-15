import { describe, expect, test } from 'vitest'
import {
  canCancelPurchase,
  cancelPurchase,
  createPurchase,
  purchaseItemTotalKop,
  purchaseStatus,
  purchaseTotalKop,
} from './purchases'
import type { ResolvedPurchaseInput } from './purchases'
import { productStock } from './stock'
import { makeBatch, makePurchase, makeScenarioDb } from './test-utils'

/** A valid purchase of 4 pcs of p1 at 15.00 into the warehouse. */
function warehousePurchase(overrides: Partial<ResolvedPurchaseInput> = {}): ResolvedPurchaseInput {
  return {
    supplierId: 's1',
    destination: 'warehouse',
    items: [{ productId: 'p1', qty: 4, unitPriceKop: 1500 }],
    ...overrides,
  }
}

describe('createPurchase into the warehouse', () => {
  test('creates one batch per item and no allocations', () => {
    const db = makeScenarioDb()
    const stockBefore = productStock(db, 'p1').qty

    const result = createPurchase(db, warehousePurchase(), 'u1')

    expect(result.ok).toBe(true)
    expect(db.purchases).toHaveLength(1)
    expect(db.purchases[0].number).toBe('З-0001')
    expect(db.counters.purchase).toBe(1)
    expect(db.allocations).toHaveLength(0)
    const created = db.batches.find((batch) => batch.purchaseId === db.purchases[0].id)
    expect(created).toMatchObject({ qtyReceived: 4, qtyRemaining: 4, unitPriceKop: 1500 })
    expect(productStock(db, 'p1').qty).toBe(stockBefore + 4)
  })

  test('writes a purchase.create entry to the audit log', () => {
    const db = makeScenarioDb()

    createPurchase(db, warehousePurchase(), 'u1')

    expect(db.audit.map((entry) => entry.action)).toEqual(['purchase.create'])
  })
})

describe('createPurchase straight into an order', () => {
  test('creates an empty batch and an allocation at the purchase price', () => {
    const db = makeScenarioDb()
    const stockBefore = productStock(db, 'p1').qty

    const result = createPurchase(
      db,
      {
        supplierId: 's1',
        destination: 'order',
        orderId: 'o1',
        items: [{ productId: 'p1', qty: 2, unitPriceKop: 1500 }],
      },
      'u1',
    )

    expect(result.ok).toBe(true)
    const created = db.batches.find((batch) => batch.purchaseId === db.purchases[0].id)!
    expect(created).toMatchObject({ qtyReceived: 2, qtyRemaining: 0 })
    expect(db.allocations).toHaveLength(1)
    expect(db.allocations[0]).toMatchObject({
      orderId: 'o1',
      qty: 2,
      totalKop: 3000,
      status: 'active',
      lines: [{ batchId: created.id, qty: 2, unitPriceKop: 1500 }],
    })
    // The warehouse stock is not touched: the goods went straight to the order.
    expect(productStock(db, 'p1').qty).toBe(stockBefore)
  })
})

describe('createPurchase validation', () => {
  const invalid: Array<[string, Partial<ResolvedPurchaseInput>, string]> = [
    ['no items', { items: [] }, 'Додайте хоча б одну позицію закупівлі.'],
    ['no supplier', { supplierId: '' }, 'Виберіть постачальника.'],
    [
      'zero quantity',
      { items: [{ productId: 'p1', qty: 0, unitPriceKop: 1500 }] },
      'Кількість у позиції має бути більшою за нуль.',
    ],
    [
      'zero price',
      { items: [{ productId: 'p1', qty: 1, unitPriceKop: 0 }] },
      'Ціна за одиницю має бути більшою за нуль.',
    ],
    [
      'no product',
      { items: [{ productId: '', qty: 1, unitPriceKop: 100 }] },
      'У кожній позиції має бути вибраний товар.',
    ],
    ['order without an order id', { destination: 'order' }, 'Виберіть заявку для закупівлі.'],
    [
      'unknown order',
      { destination: 'order', orderId: 'nope' },
      'Заявку не знайдено.',
    ],
    [
      'an issued order',
      { destination: 'order', orderId: 'oc' },
      'Заявка закрита: закупівлю напряму в неї оформити не можна.',
    ],
  ]

  test.each(invalid)('rejects %s and changes nothing', (_name, patch, message) => {
    const db = makeScenarioDb()
    const before = structuredClone(db)

    const result = createPurchase(db, warehousePurchase(patch), 'u1')

    expect(result).toEqual({ ok: false, error: message })
    expect(db).toEqual(before)
  })
})

describe('cancelPurchase', () => {
  /** A db with one purchase whose single batch is `qtyRemaining` of 4 left. */
  function dbWithPurchase(qtyRemaining: number) {
    const db = makeScenarioDb()
    db.purchases.push(
      makePurchase({
        id: 'pur9',
        items: [{ id: 'pit9', productId: 'p1', qty: 4, unitPriceKop: 1500 }],
      }),
    )
    db.batches.push(
      makeBatch({
        id: 'b9',
        purchaseId: 'pur9',
        purchaseItemId: 'pit9',
        qtyReceived: 4,
        qtyRemaining,
        unitPriceKop: 1500,
      }),
    )
    return db
  }

  test('cancels an untouched purchase, empties its batches and records the reason', () => {
    const db = dbWithPurchase(4)

    const result = cancelPurchase(db, 'pur9', '  Помилка в накладній ', 'u1')

    expect(result.ok).toBe(true)
    expect(db.purchases.find((purchase) => purchase.id === 'pur9')).toMatchObject({
      cancelled: true,
      cancelReason: 'Помилка в накладній',
    })
    expect(db.batches.find((batch) => batch.id === 'b9')!.qtyRemaining).toBe(0)
    expect(db.audit.map((entry) => entry.action)).toEqual(['purchase.cancel'])
  })

  test('refuses when something was already written off from the purchase', () => {
    const db = dbWithPurchase(3)
    const before = structuredClone(db)

    const result = cancelPurchase(db, 'pur9', 'Помилка', 'u1')

    expect(result).toEqual({
      ok: false,
      error: 'З цієї закупівлі вже є вкладення. Спочатку поверніть їх на склад.',
    })
    expect(db).toEqual(before)
  })

  test('requires a non-empty reason', () => {
    const db = dbWithPurchase(4)

    expect(cancelPurchase(db, 'pur9', '   ', 'u1')).toEqual({
      ok: false,
      error: 'Вкажіть причину скасування.',
    })
  })

  test('refuses an unknown or already cancelled purchase', () => {
    const db = dbWithPurchase(4)
    cancelPurchase(db, 'pur9', 'Помилка', 'u1')

    expect(cancelPurchase(db, 'pur9', 'Ще раз', 'u1')).toEqual({
      ok: false,
      error: 'Закупівля вже скасована.',
    })
    expect(cancelPurchase(db, 'nope', 'Помилка', 'u1')).toEqual({
      ok: false,
      error: 'Закупівлю не знайдено.',
    })
  })
})

describe('purchase status and totals', () => {
  function statusFor(received: number, remaining: number, cancelled = false) {
    const db = makeScenarioDb()
    const purchase = makePurchase({ id: 'pur9', cancelled })
    db.purchases.push(purchase)
    db.batches.push(
      makeBatch({ id: 'b9', purchaseId: 'pur9', qtyReceived: received, qtyRemaining: remaining }),
    )
    return { db, purchase }
  }

  test('"new" while nothing was written off, "partial" after some, "full" after all', () => {
    const untouched = statusFor(4, 4)
    const partial = statusFor(4, 1)
    const full = statusFor(4, 0)

    expect(purchaseStatus(untouched.db, untouched.purchase)).toBe('new')
    expect(purchaseStatus(partial.db, partial.purchase)).toBe('partial')
    expect(purchaseStatus(full.db, full.purchase)).toBe('full')
  })

  test('a purchase without batches is "new" and a cancelled one is "cancelled"', () => {
    const db = makeScenarioDb()
    const empty = makePurchase({ id: 'pur8' })
    const cancelled = statusFor(4, 0, true)

    expect(purchaseStatus(db, empty)).toBe('new')
    expect(purchaseStatus(cancelled.db, cancelled.purchase)).toBe('cancelled')
  })

  test('the total is the rounded sum of quantity times price over all items', () => {
    const purchase = makePurchase({
      items: [
        { id: 'i1', productId: 'p1', qty: 1.5, unitPriceKop: 333 },
        { id: 'i2', productId: 'p1', qty: 2, unitPriceKop: 100 },
      ],
    })

    expect(purchaseItemTotalKop(purchase.items[0])).toBe(500)
    expect(purchaseTotalKop(purchase)).toBe(700)
  })

  test('a purchase can be cancelled only while all its batches are untouched', () => {
    const untouched = statusFor(4, 4)
    const used = statusFor(4, 3)
    const cancelled = statusFor(4, 0, true)

    expect(canCancelPurchase(untouched.db, untouched.purchase)).toBe(true)
    expect(canCancelPurchase(used.db, used.purchase)).toBe(false)
    expect(canCancelPurchase(cancelled.db, cancelled.purchase)).toBe(false)
  })
})
