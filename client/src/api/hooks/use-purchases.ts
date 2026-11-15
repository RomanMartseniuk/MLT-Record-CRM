import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../active-client'
import type { CreatePurchaseInput } from '../contract/dto'
import { refreshOnSuccess } from './invalidate'
import { queryKeys } from './keys'

// A purchase creates or removes stock; one made straight into an order also
// creates an allocation. Supplier totals (count, sum, last date) change too.
const purchaseKeys = [queryKeys.purchases, queryKeys.warehouse, queryKeys.orders, queryKeys.suppliers] as const

/** All purchases, newest first, with totals and statuses already computed. */
export function usePurchases() {
  return useQuery({ queryKey: [...queryKeys.purchases, 'list'], queryFn: () => api.purchases.list() })
}

/** One purchase with its items and history. Pass undefined to skip loading. */
export function usePurchase(id: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.purchases, 'detail', id],
    queryFn: () => api.purchases.get(id as string),
    enabled: id !== undefined,
  })
}

export function useCreatePurchase() {
  return useMutation({
    mutationFn: (input: CreatePurchaseInput) => api.purchases.create(input),
    onSuccess: refreshOnSuccess(...purchaseKeys),
  })
}

/** Cancels (never deletes) a purchase; allowed only while nothing was written off from it. */
export function useCancelPurchase() {
  return useMutation({
    mutationFn: (args: { id: string; reason: string }) => api.purchases.cancel(args.id, args.reason),
    onSuccess: refreshOnSuccess(...purchaseKeys),
  })
}
