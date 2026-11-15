/**
 * Ready-made databases for the engine tests, built with the builders.
 *
 * - `makeScenarioDb` — a small stocked database for the operation tests;
 * - `makeReportsDb` and `MARCH` — a richer one for the report tests.
 */

import type { Db } from './types'
import {
  makeAllocation,
  makeAsset,
  makeBatch,
  makeDb,
  makeOrder,
  makeProduct,
  makePurchase,
  makeSupplier,
  makeUser,
} from './builders'

/**
 * The common scenario of the operation tests:
 * - user `u1`, supplier `s1`, category `c1`, product `p1` (unit "шт");
 * - open orders `o1` and `o2`, and an issued (locked) order `oc`;
 * - product `p1` has two batches: `b1` 3 pcs at 10.00 (older) and `b2` 5 pcs
 *   at 12.00 (newer), so 8 pcs in stock worth 90.00.
 */
export function makeScenarioDb(): Db {
  return makeDb({
    users: [makeUser({ id: 'u1' })],
    suppliers: [makeSupplier()],
    categories: [{ id: 'c1', name: 'Category', kind: 'product', parentId: null, active: true }],
    products: [makeProduct()],
    orders: [
      makeOrder({ id: 'o1', number: '4201' }),
      makeOrder({ id: 'o2', number: '4202' }),
      makeOrder({ id: 'oc', number: '4300', rawStatus: 'closed' }),
    ],
    batches: [
      makeBatch({
        id: 'b1',
        qtyReceived: 3,
        qtyRemaining: 3,
        unitPriceKop: 1000,
        receivedAt: '2026-01-01T10:00:00.000Z',
      }),
      makeBatch({
        id: 'b2',
        qtyReceived: 5,
        qtyRemaining: 5,
        unitPriceKop: 1200,
        receivedAt: '2026-02-01T10:00:00.000Z',
      }),
    ],
  })
}

/** The month used by the report tests. */
export const MARCH = { from: '2026-03-01T00:00:00.000Z', to: '2026-03-31T23:59:59.999Z' }

/**
 * A database for the report tests, built on top of the scenario one.
 *
 * Purchases: `pur1` (March, supplier s1, 5 pcs at 10.00, 3 left), `pur2`
 * (March, cancelled), `pur3` (January), `pur4` (February, supplier s2, all
 * 7 pcs already allocated).
 * Allocations (all active unless noted): `a1` o1 March 20.00 by u1;
 * `a2` o1 March returned; `a3` o1 January 40.00; `a4` o2 March 70.00 by u2
 * (product p2, category c2, from purchase pur4); `a5` closed order January;
 * `a6` order "od" (status ready) January.
 * Orders o1 and o2 sit on assets of different types; `o3` has no allocations.
 */
export function makeReportsDb(): Db {
  const db = makeScenarioDb()
  db.users.push(makeUser({ id: 'u2', fullName: 'Second User', email: 'second@example.com' }))
  db.suppliers.push(makeSupplier({ id: 's2', name: 'Other Supplier' }))
  db.categories.push({ id: 'c2', name: 'Other', kind: 'product', parentId: null, active: true })
  db.products.push(makeProduct({ id: 'p2', name: 'Second product', categoryId: 'c2' }))
  db.assets = [
    makeAsset({ id: 'a1', type: 'Скутер' }),
    makeAsset({ id: 'a2', type: 'Генератор' }),
  ]
  db.orders = [
    makeOrder({ id: 'o1', number: '4201', assetId: 'a1' }),
    makeOrder({ id: 'o2', number: '4202', assetId: 'a2' }),
    makeOrder({ id: 'oc', number: '4300', assetId: 'a1', rawStatus: 'closed' }),
    makeOrder({ id: 'od', number: '4400', assetId: 'a2', rawStatus: 'ready' }),
    makeOrder({ id: 'o3', number: '4500', assetId: 'a1' }),
  ]
  db.purchases = [
    makePurchase({
      id: 'pur1',
      date: '2026-03-10T12:00:00.000Z',
      items: [{ id: 'pit1', productId: 'p1', qty: 5, unitPriceKop: 1000 }],
    }),
    makePurchase({
      id: 'pur2',
      date: '2026-03-11T12:00:00.000Z',
      cancelled: true,
      items: [{ id: 'pit2', productId: 'p1', qty: 1, unitPriceKop: 9999 }],
    }),
    makePurchase({
      id: 'pur3',
      date: '2026-01-05T12:00:00.000Z',
      items: [{ id: 'pit3', productId: 'p1', qty: 1, unitPriceKop: 7777 }],
    }),
    makePurchase({
      id: 'pur4',
      date: '2026-02-10T12:00:00.000Z',
      supplierId: 's2',
      items: [{ id: 'pit4', productId: 'p2', qty: 7, unitPriceKop: 1000 }],
    }),
  ]
  db.batches = [
    makeBatch({
      id: 'bp',
      purchaseId: 'pur1',
      purchaseItemId: 'pit1',
      qtyReceived: 5,
      qtyRemaining: 3,
      unitPriceKop: 1000,
    }),
    makeBatch({
      id: 'bq',
      productId: 'p2',
      purchaseId: 'pur4',
      purchaseItemId: 'pit4',
      qtyReceived: 7,
      qtyRemaining: 0,
      unitPriceKop: 1000,
    }),
  ]
  db.allocations = [
    makeAllocation({
      id: 'a1',
      orderId: 'o1',
      createdAt: '2026-03-12T12:00:00.000Z',
      totalKop: 2000,
      lines: [{ batchId: 'bp', qty: 2, unitPriceKop: 1000 }],
    }),
    makeAllocation({
      id: 'a2',
      orderId: 'o1',
      createdAt: '2026-03-13T12:00:00.000Z',
      totalKop: 5000,
      status: 'returned',
    }),
    makeAllocation({ id: 'a3', orderId: 'o1', createdAt: '2026-01-06T12:00:00.000Z', totalKop: 4000 }),
    makeAllocation({
      id: 'a4',
      orderId: 'o2',
      productId: 'p2',
      createdAt: '2026-03-14T12:00:00.000Z',
      createdById: 'u2',
      totalKop: 7000,
      lines: [{ batchId: 'bq', qty: 7, unitPriceKop: 1000 }],
    }),
    makeAllocation({ id: 'a5', orderId: 'oc', createdAt: '2026-01-07T12:00:00.000Z', totalKop: 100 }),
    makeAllocation({ id: 'a6', orderId: 'od', createdAt: '2026-01-08T12:00:00.000Z', totalKop: 100 }),
  ]
  const entry = (id: string, at: string) => ({
    id,
    at,
    userId: 'u1',
    action: 'purchase.create' as const,
    objectType: 'Закупівля',
    objectId: 'pur1',
    objectLabel: 'З-0001',
  })
  db.audit = [
    entry('x1', '2026-02-20T12:00:00.000Z'),
    entry('x2', '2026-03-05T12:00:00.000Z'),
    entry('x3', '2026-03-20T12:00:00.000Z'),
  ]
  return db
}
