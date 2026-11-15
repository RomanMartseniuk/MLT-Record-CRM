import { useQuery } from '@tanstack/react-query'
import { api } from '../active-client'
import type { OrderFilters } from '../contract/dto'
import { queryKeys } from './keys'

/** Orders for the list page, with costs and display names. Read-only: they come from RO App. */
export function useOrders(filters?: OrderFilters) {
  return useQuery({ queryKey: [...queryKeys.orders, 'list', filters ?? null], queryFn: () => api.orders.list(filters) })
}

/** One order with its allocations and cost breakdown. Pass undefined to skip loading. */
export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.orders, 'detail', id],
    queryFn: () => api.orders.get(id as string),
    enabled: id !== undefined,
  })
}
