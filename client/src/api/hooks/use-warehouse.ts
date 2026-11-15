import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../active-client'
import type { AdjustStockInput, ProductInput, ProductPatch } from '../contract/dto'
import { refreshOnSuccess } from './invalidate'
import { queryKeys } from './keys'

// Stock changes show up in purchases (remaining stock of a purchase) and in
// product names on purchases and orders; a new product also changes the
// product count of its category. So all of those refresh with the warehouse.
const stockKeys = [queryKeys.warehouse, queryKeys.purchases, queryKeys.orders, queryKeys.categories] as const

/** All products with their current stock numbers, sorted by name. */
export function useStock() {
  return useQuery({ queryKey: [...queryKeys.warehouse, 'stock'], queryFn: () => api.warehouse.listStock() })
}

/** One product with its batches and usage history. Pass null to skip loading. */
export function useProduct(id: string | null) {
  return useQuery({
    queryKey: [...queryKeys.warehouse, 'product', id],
    queryFn: () => api.warehouse.getProduct(id as string),
    enabled: id !== null,
  })
}

/**
 * How writing off `qty` of a product would split across batches.
 * Does nothing while the quantity is not a positive number.
 */
export function useFifoPreview(productId: string, qty: number | null) {
  return useQuery({
    queryKey: [...queryKeys.warehouse, 'preview', productId, qty],
    queryFn: () => api.warehouse.previewFifo(productId, qty as number),
    enabled: qty !== null && qty > 0,
  })
}

/** Value of the whole warehouse and product counters. */
export function useStockTotals() {
  return useQuery({ queryKey: [...queryKeys.warehouse, 'totals'], queryFn: () => api.warehouse.totals() })
}

export function useCreateProduct() {
  return useMutation({
    mutationFn: (input: ProductInput) => api.warehouse.createProduct(input),
    onSuccess: refreshOnSuccess(...stockKeys),
  })
}

export function useUpdateProduct() {
  return useMutation({
    mutationFn: (args: { id: string; patch: ProductPatch }) => api.warehouse.updateProduct(args.id, args.patch),
    onSuccess: refreshOnSuccess(...stockKeys),
  })
}

/** Manual stock correction (never below zero). */
export function useAdjustStock() {
  return useMutation({
    mutationFn: (input: AdjustStockInput) => api.warehouse.adjustStock(input),
    onSuccess: refreshOnSuccess(...stockKeys),
  })
}
