import { useMutation } from '@tanstack/react-query'
import { api } from '../active-client'
import type { AddAllocationInput } from '../contract/dto'
import { refreshOnSuccess } from './invalidate'
import { queryKeys } from './keys'

// An allocation moves stock into an order: the warehouse, the purchases'
// remaining stock and the order costs all change.
const allocationKeys = [queryKeys.warehouse, queryKeys.purchases, queryKeys.orders] as const

/** Puts a product from the warehouse into an order; the price comes from FIFO. */
export function useAddAllocation() {
  return useMutation({
    mutationFn: (input: AddAllocationInput) => api.allocations.add(input),
    onSuccess: refreshOnSuccess(...allocationKeys),
  })
}

/** Puts the stock back ('returned') or voids a mistaken allocation ('cancelled'). */
export function useReleaseAllocation() {
  return useMutation({
    mutationFn: (args: { id: string; mode: 'returned' | 'cancelled'; reason?: string }) =>
      api.allocations.release(args.id, args.mode, args.reason),
    onSuccess: refreshOnSuccess(...allocationKeys),
  })
}

/** Moves an allocation to another order without touching the stock. */
export function useTransferAllocation() {
  return useMutation({
    mutationFn: (args: { id: string; toOrderId: string; reason?: string }) =>
      api.allocations.transfer(args.id, args.toOrderId, args.reason),
    onSuccess: refreshOnSuccess(...allocationKeys),
  })
}
