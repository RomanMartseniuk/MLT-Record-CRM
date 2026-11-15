/**
 * DTOs of the API contract — orders and allocations.
 *
 * Server responses arrive already computed (totals, statuses, display names),
 * so a page never calculates them itself. See ./index.ts for the full contract.
 */

import type {
  Allocation,
  Asset,
  Client,
  Order,
  OrderStatusCode,
  Unit,
} from '../types'

export interface OrderFilters {
  /** Free-text search over number, client and asset. */
  search?: string
}

/** An order on the list page (data comes from RO App, costs from allocations). */
export interface OrderRow {
  order: Order
  clientName: string
  assetTitle: string
  assetModel: string
  typeName: string
  /** Local status, or null when the RO App status has no mapping yet. */
  statusCode: OrderStatusCode | null
  statusLabel: string
  /** True when allocations on this order are locked ("Видано"). */
  locked: boolean
  costKop: number
  lastOperationAt: string | null
  allocationsCount: number
}

export interface AddAllocationInput {
  orderId: string
  productId: string
  qty: number
  /** Mandatory for a closed order. */
  reason?: string
}

/** An allocation with the names a page wants to show next to it. */
export interface AllocationRow {
  allocation: Allocation
  productName: string
  categoryName: string
  unit: Unit
  createdByName: string
  transferredFromOrderNumber?: string
  /** Purchases the written-off batches came from (empty for adjustment batches). */
  sourcePurchases: Array<{ id: string; number: string }>
}

export interface CostSlice {
  categoryId: string
  name: string
  kop: number
}

/** An order on its own page. */
export interface OrderDetail extends OrderRow {
  client?: Client
  asset?: Asset
  /** Active allocations, newest first. */
  allocations: AllocationRow[]
  /** All allocations including returned and cancelled, newest first. */
  history: AllocationRow[]
  costByCategory: CostSlice[]
}
