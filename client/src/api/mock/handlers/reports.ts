/**
 * Mock handler of the `reports` module: the dashboard and the cost analytics.
 *
 * Read-only. Every figure is computed from the accounting history, with the
 * main rule that purchases and allocations are different events and are never
 * added together (a purchase is not an expense).
 */

import type { ReportsApi } from '../../contract/client'
import type { AuditRow } from '../../contract/dto'
import { costByAssetType, costByEmployee, costBySupplier, costStats, filteredOrderIds } from '../engine/analytics'
import { previousRange } from '../engine/dates'
import { allocatedVsStock, categoryBreakdown, dashboardMetrics, moneySeries } from '../engine/reports'
import { sortBy } from '../engine/util'
import { delay } from '../latency'
import { getDb } from '../storage'

/** How many latest operations the dashboard lists. */
const RECENT_OPERATIONS = 10

export const reportsApi: ReportsApi = {
  async dashboard(range) {
    await delay()
    const db = getDb()

    // The latest operations up to the end of the chosen period, newest first.
    const recentOperations: AuditRow[] = sortBy(
      db.audit.filter((entry) => entry.at <= range.to),
      (entry) => entry.at,
    )
      .reverse()
      .slice(0, RECENT_OPERATIONS)
      .map((entry) => ({
        entry,
        userName: db.users.find((user) => user.id === entry.userId)?.fullName ?? 'Система',
      }))

    return {
      metrics: dashboardMetrics(db, range),
      series: moneySeries(db, range),
      categories: categoryBreakdown(db, range),
      allocatedVsStock: allocatedVsStock(db, range),
      recentOperations,
    }
  },

  async analytics(filters) {
    await delay()
    const db = getDb()
    const orderIds = filteredOrderIds(db, filters)
    // The same filters over the preceding period of equal length, for the comparison line.
    const previousIds = filteredOrderIds(db, { ...filters, range: previousRange(filters.range) })

    return {
      stats: costStats(db, orderIds),
      previousStats: costStats(db, previousIds),
      series: moneySeries(db, filters.range),
      byAssetType: costByAssetType(db, orderIds),
      byEmployee: costByEmployee(db, filters.range),
      bySupplier: costBySupplier(db, filters.range),
      byCategory: categoryBreakdown(db, filters.range),
    }
  },
}
