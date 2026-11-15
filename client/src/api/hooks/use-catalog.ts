import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../active-client'
import type { CategoryInput, CategoryPatch, SupplierInput, SupplierPatch } from '../contract/dto'
import { refreshOnSuccess } from './invalidate'
import { queryKeys } from './keys'

// A category change alters category names on warehouse rows and the filter lists;
// a supplier change alters supplier names on purchases and the filter lists.
const categoryKeys = [queryKeys.categories, queryKeys.warehouse, queryKeys.reference] as const
const supplierKeys = [queryKeys.suppliers, queryKeys.purchases, queryKeys.reference] as const

/* ─── Categories ───────────────────────────────────────────────────── */

/** Categories sorted by kind and name, with product counts. */
export function useCategories() {
  return useQuery({ queryKey: queryKeys.categories, queryFn: () => api.categories.list() })
}

export function useCreateCategory() {
  return useMutation({
    mutationFn: (input: CategoryInput) => api.categories.create(input),
    onSuccess: refreshOnSuccess(...categoryKeys),
  })
}

export function useUpdateCategory() {
  return useMutation({
    mutationFn: (args: { id: string; patch: CategoryPatch }) => api.categories.update(args.id, args.patch),
    onSuccess: refreshOnSuccess(...categoryKeys),
  })
}

/* ─── Suppliers ────────────────────────────────────────────────────── */

/** Suppliers with purchase totals, the biggest total first. */
export function useSuppliers() {
  return useQuery({ queryKey: queryKeys.suppliers, queryFn: () => api.suppliers.list() })
}

export function useCreateSupplier() {
  return useMutation({
    mutationFn: (input: SupplierInput) => api.suppliers.create(input),
    onSuccess: refreshOnSuccess(...supplierKeys),
  })
}

export function useUpdateSupplier() {
  return useMutation({
    mutationFn: (args: { id: string; patch: SupplierPatch }) => api.suppliers.update(args.id, args.patch),
    onSuccess: refreshOnSuccess(...supplierKeys),
  })
}
