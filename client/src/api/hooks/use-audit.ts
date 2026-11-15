import { useQuery } from '@tanstack/react-query'
import { api } from '../active-client'
import type { DateRange } from '../contract/dto'
import { queryKeys } from './keys'

/** The operations journal for a period, newest first. */
export function useAudit(range: DateRange) {
  return useQuery({
    queryKey: [...queryKeys.audit, range.from, range.to],
    queryFn: () => api.audit.list({ range }),
  })
}
