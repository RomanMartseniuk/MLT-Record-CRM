import { describe, expect, test } from 'vitest'
import type { AnalyticsFilters } from '@/api/contract/dto'
import { EMPTY_FILTER } from '@/api/contract/constants'
import {
  costByAssetType,
  costByEmployee,
  costBySupplier,
  costStats,
  filteredOrderIds,
} from './analytics'
import { MARCH, makeReportsDb } from './test-utils'

const db = makeReportsDb()
const ALL_TIME = { from: '2026-01-01T00:00:00.000Z', to: '2026-12-31T23:59:59.999Z' }

/** Filters that let everything through, with the given overrides. */
function filters(overrides: Partial<AnalyticsFilters> = {}): AnalyticsFilters {
  return {
    range: MARCH,
    userId: EMPTY_FILTER,
    categoryId: EMPTY_FILTER,
    supplierId: EMPTY_FILTER,
    assetType: EMPTY_FILTER,
    status: EMPTY_FILTER,
    ...overrides,
  }
}

describe('filteredOrderIds', () => {
  test('keeps only orders that have an active allocation inside the period', () => {
    expect(filteredOrderIds(db, filters())).toEqual(['o1', 'o2'])
  })

  test('filters by the local status code of the order', () => {
    expect(filteredOrderIds(db, filters({ range: ALL_TIME, status: 'done' }))).toEqual(['od'])
  })

  test('filters by the user who made the allocation', () => {
    expect(filteredOrderIds(db, filters({ userId: 'u2' }))).toEqual(['o2'])
  })

  test('filters by product category', () => {
    expect(filteredOrderIds(db, filters({ categoryId: 'c1' }))).toEqual(['o1'])
    expect(filteredOrderIds(db, filters({ categoryId: 'c2' }))).toEqual(['o2'])
  })

  test('filters by the supplier of the purchase the written-off batch came from', () => {
    expect(filteredOrderIds(db, filters({ supplierId: 's1' }))).toEqual(['o1'])
    expect(filteredOrderIds(db, filters({ supplierId: 's2' }))).toEqual(['o2'])
  })

  test('filters by asset type', () => {
    expect(filteredOrderIds(db, filters({ range: ALL_TIME, assetType: 'Скутер' }))).toEqual(['o1', 'oc'])
  })
})

describe('costStats', () => {
  test('summarises the cost of orders and ignores orders that cost nothing', () => {
    // o1 costs 20.00 + 40.00, o2 costs 70.00, o3 has no allocations.
    expect(costStats(db, ['o1', 'o2', 'o3'])).toEqual({
      count: 2,
      totalKop: 13000,
      avgKop: 6500,
      minKop: 6000,
      maxKop: 7000,
    })
  })

  test('an empty set gives zeros instead of NaN or Infinity', () => {
    expect(costStats(db, [])).toEqual({ count: 0, totalKop: 0, avgKop: 0, minKop: 0, maxKop: 0 })
  })
})

describe('cost breakdowns', () => {
  test('costByAssetType groups order costs by asset type, biggest first', () => {
    expect(costByAssetType(db, ['o1', 'o2'])).toEqual([
      { name: 'Генератор', value: 70 },
      { name: 'Скутер', value: 60 },
    ])
  })

  test('costByEmployee groups the period allocations by their author', () => {
    expect(costByEmployee(db, MARCH)).toEqual([
      { name: 'Second User', value: 70 },
      { name: 'Test User', value: 20 },
    ])
  })

  test('costBySupplier groups the period purchases by supplier and skips cancelled ones', () => {
    expect(costBySupplier(db, MARCH)).toEqual([{ name: 'Supplier', value: 50 }])
  })
})
