import type { ApiResult } from '../contract/result'
import { reportKeys } from './keys'
import { queryClient } from './query-client'

/**
 * Marks cached data as outdated so every view that shows it refetches.
 * Every write also outdates the report-like views (audit log, dashboard,
 * analytics), because each write adds a record to the history they show.
 */
export async function invalidateAfterWrite(...keys: ReadonlyArray<readonly unknown[]>): Promise<void> {
  await Promise.all([...keys, ...reportKeys].map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

/**
 * Wraps the `onSuccess` of a mutation that returns an `ApiResult`:
 * the cache is refreshed only when the operation really succeeded
 * (a business error changes nothing, so nothing needs refetching).
 */
export function refreshOnSuccess(...keys: ReadonlyArray<readonly unknown[]>) {
  return async (result: ApiResult<unknown>): Promise<void> => {
    if (result.ok) await invalidateAfterWrite(...keys)
  }
}
