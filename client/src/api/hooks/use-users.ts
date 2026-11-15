import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../active-client'
import type { UserInput, UserPatch } from '../contract/dto'
import { refreshOnSuccess } from './invalidate'
import { queryKeys } from './keys'

/** All users (administrators only, enforced by the server). */
export function useUsers() {
  return useQuery({ queryKey: queryKeys.users, queryFn: () => api.users.list() })
}

// A user change can alter the demo user list, the signed-in user's own
// permissions and the employee filter lists, so those are refreshed too.
const userKeys = [queryKeys.users, queryKeys.demoUsers, queryKeys.session, queryKeys.reference] as const

export function useCreateUser() {
  return useMutation({
    mutationFn: (input: UserInput) => api.users.create(input),
    onSuccess: refreshOnSuccess(...userKeys),
  })
}

export function useUpdateUser() {
  return useMutation({
    mutationFn: (args: { id: string; patch: UserPatch }) => api.users.update(args.id, args.patch),
    onSuccess: refreshOnSuccess(...userKeys),
  })
}
