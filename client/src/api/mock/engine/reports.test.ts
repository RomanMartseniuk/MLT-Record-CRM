import { describe, expect, test } from 'vitest'
import {
  allocatedVsStock,
  categoryBreakdown,
  dashboardMetrics,
  moneySeries,
} from './reports'
import { MARCH, makeReportsDb } from './test-utils'

const db = makeReportsDb()

describe('dashboardMetrics', () => {
  const metrics = dashboardMetrics(db, MARCH)

  test('purchases of the period exclude cancelled purchases and other months', () => {
    // Only pur1 counts: pur2 is cancelled, pur3 and pur4 are in other months.
    expect(metrics.purchasesKop).toBe(5000)
  })

  test('allocations of the period include only active ones inside the period', () => {
    // a1 (20.00) + a4 (70.00); a2 is returned, the rest is in January.
    expect(metrics.allocatedKop).toBe(9000)
  })

  test('stock value is the current value of all batches, independent of the period', () => {
    expect(metrics.stockValueKop).toBe(3000)
  })

  test('active orders with allocations exclude only issued orders', () => {
    // o1, o2 and the "ready" order od count; the issued order oc and the
    // order without allocations o3 do not.
    expect(metrics.activeOrdersWithAllocations).toBe(3)
  })

  test('operations count covers only audit entries of the period', () => {
    expect(metrics.operationsCount).toBe(2)
  })
})

describe('allocatedVsStock', () => {
  test('splits the period purchases into "in orders" and "in stock", in whole hryvnias', () => {
    expect(allocatedVsStock(db, MARCH)).toEqual([
      { name: 'У заявках', value: 20 },
      { name: 'На складі', value: 30 },
    ])
  })
})

describe('categoryBreakdown', () => {
  test('groups active allocations of the period by category name, biggest first', () => {
    expect(categoryBreakdown(db, MARCH)).toEqual([
      { name: 'Other', value: 70 },
      { name: 'Category', value: 20 },
    ])
  })
})

describe('moneySeries', () => {
  const series = moneySeries(db, MARCH)

  test('keeps the totals of purchases and allocations in whole hryvnias', () => {
    const purchases = series.reduce((total, point) => total + point.purchases, 0)
    const allocations = series.reduce((total, point) => total + point.allocations, 0)

    expect(purchases).toBe(50)
    expect(allocations).toBe(90)
  })

  test('does not lose empty days, so the line has no gaps', () => {
    expect(series.length).toBeGreaterThanOrEqual(30)
    expect(series.filter((point) => point.purchases === 0 && point.allocations === 0).length).toBeGreaterThan(20)
  })
})
