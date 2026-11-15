import { useQuery } from '@tanstack/react-query'
import { api } from '../active-client'
import { queryKeys } from './keys'

/**
 * Reference lists for filters and labels: order types, the RO App status
 * mapping, asset types and the statuses that still have no mapping.
 */
export function useReference() {
  return useQuery({ queryKey: queryKeys.reference, queryFn: () => api.reference.get() })
}
