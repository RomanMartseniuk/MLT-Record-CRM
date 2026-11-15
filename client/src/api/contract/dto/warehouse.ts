/**
 * DTOs of the API contract — warehouse: products, stock, batches and FIFO.
 *
 * Server responses arrive already computed (totals, statuses, display names),
 * so a page never calculates them itself. See ./index.ts for the full contract.
 */

import type {
  Allocation,
  AllocationLine,
  Batch,
  Product,
  ProductLink,
  Unit,
} from '../types'

export interface ProductInput {
  name: string
  categoryId: string
  unit: Unit
  links: ProductLink[]
}

export type ProductPatch = Partial<ProductInput>

export interface AdjustStockInput {
  productId: string
  /** Positive adds stock, negative removes it. Never below zero in total. */
  deltaQty: number
  reason: string
}

/** One product on the warehouse page with its current stock numbers. */
export interface StockRow {
  product: Product
  categoryName: string
  qty: number
  avgPriceKop: number
  valueKop: number
  inStock: boolean
  /** Number of batches that still have stock. */
  batchCount: number
}

/** A batch with the names a page wants to show next to it. */
export interface BatchRow extends Batch {
  supplierName: string
  /** Purchase number, or an empty string for an adjustment batch. */
  purchaseNumber: string
}

/** An allocation of a product into an order, as listed on the product card. */
export interface ProductUsageRow {
  allocation: Allocation
  /** Number of the order, or null if the order is unknown. */
  orderNumber: string | null
}

/** Everything the product card needs. */
export interface ProductDetail {
  stock: StockRow
  /** All batches of the product including empty ones, newest first. */
  batches: BatchRow[]
  /** All allocations of the product, newest first. */
  usage: ProductUsageRow[]
}

/** One FIFO line of a preview: the allocation line plus the date its batch was received. */
export interface FifoPreviewLine extends AllocationLine {
  receivedAt: string
}

/** What a write-off of `qty` would look like, without performing it. */
export interface FifoPreview {
  lines: FifoPreviewLine[]
  totalKop: number
  /** How much of the requested quantity the warehouse cannot cover. */
  shortfall: number
}

export interface StockTotals {
  /** Current value of the whole warehouse. */
  valueKop: number
  productsInStock: number
  /** Number of products in the reference list, in stock or not. */
  productsCount: number
}
