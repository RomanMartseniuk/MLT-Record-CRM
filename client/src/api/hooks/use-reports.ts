import { useQuery } from '@tanstack/react-query'
import { api } from '../active-client'
import type { AnalyticsFilters, DateRange } from '../contract/dto'
import { queryKeys } from './keys'

/**
 * Dashboard numbers, charts and latest operations for a period.
 * The key uses the two date strings, not the range object, so an equal period
 * rebuilt on every render does not trigger a new request.
 */
export function useDashboard(range: DateRange) {
  return useQuery({
    queryKey: [...queryKeys.dashboard, range.from, range.to],
    queryFn: () => api.reports.dashboard(range),
  })
}

/** Cost analytics for a period with the chosen filters. */
export function useAnalytics(filters: AnalyticsFilters) {
  const { range, userId, categoryId, supplierId, assetType, status } = filters
  return useQuery({
    queryKey: [...queryKeys.analytics, range.from, range.to, userId, categoryId, supplierId, assetType, status],
    queryFn: () => api.reports.analytics(filters),
  })
}
