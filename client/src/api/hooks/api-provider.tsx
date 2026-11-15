import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { queryClient } from './query-client'

/**
 * Makes the query cache available to every page.
 * Mount it once, above the router and above any component that uses an
 * API hook.
 *
 * It knows nothing about the mock server: after a write, each mutation hook
 * invalidates exactly the cached data the write may have changed.
 */
export function ApiProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
