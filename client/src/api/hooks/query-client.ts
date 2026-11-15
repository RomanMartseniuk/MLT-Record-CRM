import { QueryClient } from '@tanstack/react-query'

/**
 * The single TanStack Query client of the app.
 *
 * Defaults are chosen for a business app that must never show stale money
 * or stock numbers:
 * - `staleTime: 0` — cached data is refetched whenever a view mounts.
 * - `retry: false` — a failed request is shown to the user, not repeated
 *   silently (a repeated write could duplicate an operation).
 * - `refetchOnWindowFocus: false` — avoids surprise reloads while a form is open.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})
