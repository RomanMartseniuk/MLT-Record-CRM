/**
 * DTOs of the API contract — users, categories and suppliers.
 *
 * Server responses arrive already computed (totals, statuses, display names),
 * so a page never calculates them itself. See ./index.ts for the full contract.
 */

import type {
  Category,
  CategoryKind,
  Permission,
  Supplier,
  UserRole,
} from '../types'

export interface UserInput {
  fullName: string
  email: string
  role: UserRole
  extraPermissions: Permission[]
}

export interface UserPatch {
  role?: UserRole
  extraPermissions?: Permission[]
  blocked?: boolean
}

export interface CategoryInput {
  name: string
  kind: CategoryKind
  parentId: string | null
}

export type CategoryPatch = Partial<CategoryInput> & { active?: boolean }

export interface SupplierInput {
  name: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  comment?: string
}

export type SupplierPatch = Partial<SupplierInput> & { active?: boolean }

/** A supplier together with the totals of their (non-cancelled) purchases. */
export interface SupplierRow extends Supplier {
  purchasesCount: number
  purchasesTotalKop: number
  /** Date of the latest non-cancelled purchase, or null if there is none. */
  lastPurchaseDate: string | null
}

/** A category with the number of products in it and the name of its parent. */
export interface CategoryRow extends Category {
  productCount: number
  parentName: string | null
}
