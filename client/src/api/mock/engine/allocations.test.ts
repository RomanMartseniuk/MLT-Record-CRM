import { describe, expect, test } from 'vitest'
import type { Allocation } from '@/api/contract/types'
import {
  addAllocation,
  orderAllocationHistory,
  orderAllocations,
  orderCostByCategory,
  orderCostKop,
  orderLastOperationAt,
  releaseAllocation,
  transferAllocation,
} from './allocations'
import { makeAllocation, makeScenarioDb } from './test-utils'
import type { Db } from './types'

const CLOSED_REASON_MESSAGE = 'Для закритої заявки потрібно вказати причину зміни.'

function batchQty(db: Db, id: string): number {
  return db.batches.find((batch) => batch.id === id)!.qtyRemaining
}

/** Adds an allocation that must succeed and returns it. */
function allocate(db: Db, orderId: string, qty: number, reason?: string): Allocation {
  const result = addAllocation(db, { orderId, productId: 'p1', qty, reason }, 'u1')
  if (!result.ok) throw new Error(result.error)
  return result.value
}

describe('addAllocation', () => {
  test('writes off by FIFO and totals the lines at their own batch prices', () => {
    const db = makeScenarioDb()

    const allocation = allocate(db, 'o1', 5)

    expect(allocation.lines).toEqual([
      { batchId: 'b1', qty: 3, unitPriceKop: 1000 },
      { batchId: 'b2', qty: 2, unitPriceKop: 1200 },
    ])
    expect(allocation.totalKop).toBe(3 * 1000 + 2 * 1200)
    expect(allocation.status).toBe('active')
    expect(batchQty(db, 'b1')).toBe(0)
    expect(batchQty(db, 'b2')).toBe(3)
    expect(orderCostKop(db, 'o1')).toBe(5400)
  })

  test('rejects a quantity above the stock and changes nothing', () => {
    const db = makeScenarioDb()
    const before = structuredClone(db)

    const result = addAllocation(db, { orderId: 'o1', productId: 'p1', qty: 9 }, 'u1')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('На складі доступно лише')
    expect(db).toEqual(before)
  })

  test('rejects a zero quantity, an unknown order and an unknown product', () => {
    const db = makeScenarioDb()

    expect(addAllocation(db, { orderId: 'o1', productId: 'p1', qty: 0 }, 'u1')).toEqual({
      ok: false,
      error: 'Кількість має бути більшою за нуль.',
    })
    expect(addAllocation(db, { orderId: 'nope', productId: 'p1', qty: 1 }, 'u1')).toEqual({
      ok: false,
      error: 'Заявку не знайдено.',
    })
    expect(addAllocation(db, { orderId: 'o1', productId: 'nope', qty: 1 }, 'u1')).toEqual({
      ok: false,
      error: 'Товар не знайдено.',
    })
  })

  test('an issued order needs a reason; with one the allocation is saved with it', () => {
    const db = makeScenarioDb()
    const before = structuredClone(db)

    const withoutReason = addAllocation(db, { orderId: 'oc', productId: 'p1', qty: 1 }, 'u1')
    expect(withoutReason).toEqual({ ok: false, error: CLOSED_REASON_MESSAGE })
    expect(db).toEqual(before)

    const allocation = allocate(db, 'oc', 1, '  Знайшли недообліковану деталь ')
    expect(allocation.reason).toBe('Знайшли недообліковану деталь')
  })

  test('records an allocation.create entry in the audit log', () => {
    const db = makeScenarioDb()

    allocate(db, 'o1', 1)

    expect(db.audit.map((entry) => entry.action)).toEqual(['allocation.create'])
  })
})

describe('releaseAllocation', () => {
  test('"returned" puts the quantity back into the same batches', () => {
    const db = makeScenarioDb()
    const allocation = allocate(db, 'o1', 5)

    const result = releaseAllocation(db, allocation.id, 'returned', 'u1')

    expect(result.ok).toBe(true)
    expect(batchQty(db, 'b1')).toBe(3)
    expect(batchQty(db, 'b2')).toBe(5)
    expect(db.allocations[0].status).toBe('returned')
    expect(orderCostKop(db, 'o1')).toBe(0)
    expect(db.audit.map((entry) => entry.action)).toContain('allocation.return')
  })

  test('"cancelled" restores the stock too, but marks the allocation cancelled', () => {
    const db = makeScenarioDb()
    const allocation = allocate(db, 'o1', 2)

    releaseAllocation(db, allocation.id, 'cancelled', 'u1')

    expect(batchQty(db, 'b1')).toBe(3)
    expect(db.allocations[0].status).toBe('cancelled')
    expect(db.audit.map((entry) => entry.action)).toContain('allocation.cancel')
  })

  test('an allocation that is no longer active cannot be released again', () => {
    const db = makeScenarioDb()
    const allocation = allocate(db, 'o1', 2)
    releaseAllocation(db, allocation.id, 'returned', 'u1')

    expect(releaseAllocation(db, allocation.id, 'returned', 'u1')).toEqual({
      ok: false,
      error: 'Це вкладення вже не активне.',
    })
  })

  test('on an issued order a reason is mandatory', () => {
    const db = makeScenarioDb()
    const allocation = allocate(db, 'oc', 1, 'Початкове вкладення')
    const before = structuredClone(db)

    expect(releaseAllocation(db, allocation.id, 'returned', 'u1')).toEqual({
      ok: false,
      error: CLOSED_REASON_MESSAGE,
    })
    expect(db).toEqual(before)
    expect(releaseAllocation(db, allocation.id, 'returned', 'u1', 'Повернули').ok).toBe(true)
  })
})

describe('transferAllocation', () => {
  test('moves the allocation to another order without touching stock or prices', () => {
    const db = makeScenarioDb()
    const allocation = allocate(db, 'o1', 5)
    const stockBefore = structuredClone(db.batches)

    const result = transferAllocation(db, allocation.id, 'o2', 'u1')

    expect(result.ok).toBe(true)
    expect(db.allocations[0]).toMatchObject({
      orderId: 'o2',
      transferredFromOrderId: 'o1',
      totalKop: 5400,
    })
    expect(db.batches).toEqual(stockBefore)
    expect(orderCostKop(db, 'o1')).toBe(0)
    expect(orderCostKop(db, 'o2')).toBe(5400)
    expect(db.audit.map((entry) => entry.action)).toContain('allocation.transfer')
  })

  test('refuses the same order and an allocation that is not active', () => {
    const db = makeScenarioDb()
    const allocation = allocate(db, 'o1', 1)

    expect(transferAllocation(db, allocation.id, 'o1', 'u1')).toEqual({
      ok: false,
      error: 'Це та сама заявка.',
    })
    releaseAllocation(db, allocation.id, 'returned', 'u1')
    expect(transferAllocation(db, allocation.id, 'o2', 'u1')).toEqual({
      ok: false,
      error: 'Це вкладення вже не активне.',
    })
  })

  test('a reason is mandatory when either order is issued', () => {
    const db = makeScenarioDb()
    const allocation = allocate(db, 'o1', 1)

    expect(transferAllocation(db, allocation.id, 'oc', 'u1')).toEqual({
      ok: false,
      error: CLOSED_REASON_MESSAGE,
    })
    expect(transferAllocation(db, allocation.id, 'oc', 'u1', 'Помилкова заявка').ok).toBe(true)
  })
})

describe('order queries', () => {
  test('active allocations and history are newest first; history keeps released ones', () => {
    const db = makeScenarioDb()
    db.allocations.push(
      makeAllocation({ id: 'a1', createdAt: '2026-01-02T00:00:00.000Z', totalKop: 100 }),
      makeAllocation({ id: 'a2', createdAt: '2026-01-03T00:00:00.000Z', totalKop: 200 }),
      makeAllocation({ id: 'a3', createdAt: '2026-01-04T00:00:00.000Z', status: 'returned' }),
    )

    expect(orderAllocations(db, 'o1').map((a) => a.id)).toEqual(['a2', 'a1'])
    expect(orderAllocationHistory(db, 'o1').map((a) => a.id)).toEqual(['a3', 'a2', 'a1'])
    expect(orderCostKop(db, 'o1')).toBe(300)
    expect(orderLastOperationAt(db, 'o1')).toBe('2026-01-04T00:00:00.000Z')
    expect(orderLastOperationAt(db, 'o2')).toBeNull()
  })

  test('cost by category groups active allocations, biggest first', () => {
    const db = makeScenarioDb()
    db.products.push({ ...db.products[0], id: 'p2', categoryId: 'gone' })
    db.allocations.push(
      makeAllocation({ id: 'a1', productId: 'p1', totalKop: 100 }),
      makeAllocation({ id: 'a2', productId: 'p2', totalKop: 900 }),
    )

    expect(orderCostByCategory(db, 'o1')).toEqual([
      { categoryId: 'gone', name: 'Без категорії', kop: 900 },
      { categoryId: 'c1', name: 'Category', kop: 100 },
    ])
  })
})
