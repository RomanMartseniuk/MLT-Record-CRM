/**
 * DTOs of the API contract — purchases.
 *
 * Server responses arrive already computed (totals, statuses, display names),
 * so a page never calculates them itself. See ./index.ts for the full contract.
 */

import type {
  Purchase,
  PurchaseDestination,
  PurchaseItem,
  PurchaseStatus,
  Unit,
} from '../types'
import type { ProductInput } from './warehouse'
import type { AuditRow } from './reports'

export interface PurchaseItemInput {
  productId: string
  qty: number
  unitPriceKop: number
  note?: string
}

/**
 * An item for a product that does not exist yet: the server creates the
 * product and the purchase together, in one atomic operation (if the purchase
 * is refused, no orphan product is left behind).
 */
export interface NewProductPurchaseItemInput {
  newProduct: ProductInput
  qty: number
  unitPriceKop: number
  note?: string
}

export interface CreatePurchaseInput {
  date?: string
  supplierId: string
  docNumber?: string
  comment?: string
  hasReceipt?: boolean
  destination: PurchaseDestination
  /** Required when `destination` is 'order'. */
  orderId?: string
  items: Array<PurchaseItemInput | NewProductPurchaseItemInput>
}

export interface CreatePurchaseResult {
  purchaseId: string
  allocationIds: string[]
}

/** A purchase on the list page. */
export interface PurchaseRow {
  purchase: Purchase
  supplierName: string
  createdByName: string
  /** Number of the order for a purchase made straight into an order. */
  orderNumber?: string
  status: PurchaseStatus
  totalKop: number
  /** Part of the purchase already put into orders (at its batch prices). */
  allocatedKop: number
  /** Part of the purchase still in the warehouse (at its batch prices). */
  remainingKop: number
}

/** A purchase item with the product name and how much of it is used / still available. */
export interface PurchaseItemRow {
  item: PurchaseItem
  productName: string
  unit: Unit
  totalKop: number
  /** Quantity already put into orders. */
  allocatedQty: number
  /** Quantity still in the warehouse. */
  availableQty: number
}

/** A purchase on its own page. */
export interface PurchaseDetail extends PurchaseRow {
  items: PurchaseItemRow[]
  /** True when nothing was written off from this purchase yet and it is not cancelled. */
  canCancel: boolean
  /** Audit entries about this purchase, newest first. */
  history: AuditRow[]
}
