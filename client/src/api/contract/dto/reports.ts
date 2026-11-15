/**
 * DTOs of the API contract — reports, dashboard, analytics and the audit journal.
 *
 * Server responses arrive already computed (totals, statuses, display names),
 * so a page never calculates them itself. See ./index.ts for the full contract.
 */

import type {
  AuditEntry,
} from '../types'
import type { DateRange, NamedValue, SeriesPoint } from './common'

export interface DashboardMetrics {
  purchasesKop: number
  allocatedKop: number
  stockValueKop: number
  activeOrdersWithAllocations: number
  operationsCount: number
}

export interface AuditRow {
  entry: AuditEntry
  userName: string
}

export interface DashboardData {
  metrics: DashboardMetrics
  series: SeriesPoint[]
  categories: NamedValue[]
  /** Purchases of the period split into "in orders" and "in stock". */
  allocatedVsStock: NamedValue[]
  recentOperations: AuditRow[]
}

export interface AnalyticsFilters {
  range: DateRange
  /** 'all' means no filter on that field. */
  userId: string
  categoryId: string
  supplierId: string
  assetType: string
  status: string
}

export interface CostStats {
  count: number
  totalKop: number
  avgKop: number
  minKop: number
  maxKop: number
}

export interface AnalyticsData {
  /** Cost statistics of the orders that passed the filters. */
  stats: CostStats
  /** The same statistics for the preceding period of equal length, for comparison. */
  previousStats: CostStats
  series: SeriesPoint[]
  byAssetType: NamedValue[]
  byEmployee: NamedValue[]
  bySupplier: NamedValue[]
  byCategory: NamedValue[]
}

export interface AuditFilters {
  range: DateRange
}
