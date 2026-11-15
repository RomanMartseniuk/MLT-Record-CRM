/**
 * Mock handler of the `warehouse` module: products and everything about
 * their stock (levels, batches, FIFO preview, adjustments).
 *
 * Stock is never stored on a product: it is always computed from batches,
 * which are the single source of truth for quantities and prices.
 */

import type { WarehouseApi } from '../../contract/client'
import type { BatchRow, ProductDetail, ProductUsageRow, StockRow } from '../../contract/dto'
import { adjustStock } from '../engine/adjust'
import { createProduct, updateProduct } from '../engine/catalog'
import { fifoBatches, planFifo } from '../engine/fifo'
import { productStock, totalStockValueKop } from '../engine/stock'
import type { Db } from '../engine/types'
import { sortBy } from '../engine/util'
import { delay } from '../latency'
import { getDb } from '../storage'
import { runAsActor } from './session'

/** One warehouse row for a product: its category name and current stock numbers. */
function stockRow(db: Db, productId: string): StockRow | null {
  const product = db.products.find((item) => item.id === productId)
  if (!product) return null
  const stock = productStock(db, product.id)
  const category = db.categories.find((item) => item.id === product.categoryId)
  return {
    product,
    categoryName: category ? category.name : 'Без категорії',
    qty: stock.qty,
    avgPriceKop: stock.avgPriceKop,
    valueKop: stock.valueKop,
    inStock: stock.inStock,
    batchCount: stock.batches.length,
  }
}

export const warehouseApi: WarehouseApi = {
  async listStock() {
    await delay()
    const db = getDb()
    const rows = db.products.map((product) => stockRow(db, product.id)!)
    return sortBy(rows, (row) => row.product.name)
  },

  async getProduct(id) {
    await delay()
    const db = getDb()
    const stock = stockRow(db, id)
    if (!stock) return null

    // Every batch the product ever had, newest first; an adjustment batch has no purchase.
    const batches: BatchRow[] = sortBy(
      db.batches.filter((batch) => batch.productId === id),
      (batch) => batch.receivedAt,
    )
      .reverse()
      .map((batch) => {
        const purchase = db.purchases.find((item) => item.id === batch.purchaseId)
        const supplier = purchase ? db.suppliers.find((item) => item.id === purchase.supplierId) : undefined
        return {
          ...batch,
          supplierName: supplier ? supplier.name : '',
          purchaseNumber: purchase ? purchase.number : '',
        }
      })

    const usage: ProductUsageRow[] = sortBy(
      db.allocations.filter((allocation) => allocation.productId === id),
      (allocation) => allocation.createdAt,
    )
      .reverse()
      .map((allocation) => ({
        allocation,
        orderNumber: db.orders.find((order) => order.id === allocation.orderId)?.number ?? null,
      }))

    const detail: ProductDetail = { stock, batches, usage }
    return detail
  },

  async previewFifo(productId, qty) {
    await delay()
    const db = getDb()
    const plan = planFifo(fifoBatches(db, productId), qty)
    // Each line also carries the date of its batch, which the allocation dialog shows.
    const lines = plan.lines.map((line) => ({
      ...line,
      receivedAt: db.batches.find((batch) => batch.id === line.batchId)?.receivedAt ?? '',
    }))
    return { lines, totalKop: plan.totalKop, shortfall: plan.shortfall }
  },

  async totals() {
    await delay()
    const db = getDb()
    return {
      valueKop: totalStockValueKop(db),
      productsInStock: db.products.filter((product) => productStock(db, product.id).qty > 0).length,
      productsCount: db.products.length,
    }
  },

  async createProduct(input) {
    await delay()
    return runAsActor((draft, userId) => createProduct(draft, input, userId))
  },

  async updateProduct(id, patch) {
    await delay()
    return runAsActor((draft, userId) => updateProduct(draft, id, patch, userId))
  },

  async adjustStock(input) {
    await delay()
    return runAsActor((draft, userId) => adjustStock(draft, input.productId, input.deltaQty, input.reason, userId))
  },
}
