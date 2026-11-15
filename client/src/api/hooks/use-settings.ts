import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../active-client'
import type { Settings } from '../contract/types'
import { queryKeys } from './keys'
import { queryClient } from './query-client'

/** Organisation and integration settings. */
export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: () => api.settings.get() })
}

/** Applies a partial change; the cache is updated with the settings the server returns. */
export function useUpdateSettings() {
  return useMutation({
    mutationFn: (patch: Partial<Settings>) => api.settings.update(patch),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.settings, settings)
      // The webhook parameters are also shown on the integration page.
      void queryClient.invalidateQueries({ queryKey: queryKeys.integration })
    },
  })
}

/** Demo only: restores the initial demo data and refetches every view. */
export function useResetDemoData() {
  return useMutation({
    mutationFn: () => api.settings.resetDemoData(),
    onSuccess: () => queryClient.resetQueries(),
  })
}
