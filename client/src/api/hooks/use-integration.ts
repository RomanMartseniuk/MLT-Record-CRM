import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../active-client'
import type { SyncSource } from '../contract/types'
import { refreshOnSuccess } from './invalidate'
import { queryKeys } from './keys'

/** Last synchronisation, the sync log and the webhook settings. */
export function useIntegrationStatus() {
  return useQuery({ queryKey: queryKeys.integration, queryFn: () => api.integration.status() })
}

/**
 * Refreshes data from RO App. The three ways (webhook, button, nightly run)
 * share one logic; `source` only labels the log entry.
 * Orders and their statuses change, so those caches are refreshed too.
 */
export function useSync() {
  return useMutation({
    mutationFn: (source: SyncSource) => api.integration.sync(source),
    onSuccess: refreshOnSuccess(queryKeys.integration, queryKeys.orders, queryKeys.reference),
  })
}
