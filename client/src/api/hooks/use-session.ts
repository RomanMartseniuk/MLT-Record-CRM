import { useMutation, useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { api } from '../active-client'
import type { Session } from '../contract/dto'
import type { ApiResult } from '../contract/result'
import type { Permission } from '../contract/types'
import { queryKeys } from './keys'
import { queryClient } from './query-client'

/**
 * Drops everything cached for the previous user and remembers the new
 * session. Called after every successful sign-in and after sign-out, so one
 * user never sees data (or permissions) cached for another.
 */
async function replaceSession(session: Session | null): Promise<void> {
  await queryClient.resetQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.session[0] })
  queryClient.setQueryData(queryKeys.session, session)
}

/**
 * The signed-in user and what they may do.
 *
 * `can(permission)` is for hiding buttons and pages. The real decision is
 * always made by the server on every request.
 */
export function useSession() {
  const query = useQuery({ queryKey: queryKeys.session, queryFn: () => api.auth.me() })
  const session = query.data ?? null

  const can = useCallback(
    (permission: Permission) => session?.permissions.includes(permission) ?? false,
    [session],
  )

  return { session, user: session?.user ?? null, isLoading: query.isLoading, can }
}

/** Users offered by the demo user switcher. */
export function useDemoUsers() {
  return useQuery({ queryKey: queryKeys.demoUsers, queryFn: () => api.auth.listDemoUsers() })
}

/** Signs in by e-mail and password. Resolves with the result so the form can show an error. */
export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }): Promise<ApiResult<Session>> => {
      const result = await api.auth.login(credentials.email, credentials.password)
      if (result.ok) await replaceSession(result.value)
      return result
    },
  })
}

/** Demo shortcut: signs in as a chosen user (used by the login screen and the user switcher). */
export function useLoginAsDemo() {
  return useMutation({
    mutationFn: async (userId: string): Promise<ApiResult<Session>> => {
      const result = await api.auth.loginAsDemo(userId)
      if (result.ok) await replaceSession(result.value)
      return result
    },
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await api.auth.logout()
      await replaceSession(null)
    },
  })
}
