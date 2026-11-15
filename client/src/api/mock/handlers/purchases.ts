/**
 * Mock handler of the `purchases` module.
 *
 * A purchase is not an expense: it creates batches (stock). Rows carry the
 * totals and the status already computed, so pages never add up purchase
 * and allocation money themselves. Purchases are never deleted, only
 * cancelled.
 */

import type { PurchasesApi } from '../../contract/client'
import type { AuditRow, PurchaseDetail, PurchaseItemInput, PurchaseItemRow, PurchaseRow } from '../../contract/dto'
import { createProduct } from '../engine/catalog'
import { roundQty } from '../engine/money'
import {
  canCancelPurchase,
  cancelPurchase,
  createPurchase,
  itemBatch,
  purchaseAllocatedKop,
  purchaseItemTotalKop,
  purchaseRemainingKop,
  purchaseStatus,
  purchaseTotalKop,
} from '../engine/purchases'
import type { Db } from '../engine/types'
import { sortBy } from '../engine/util'
import { delay } from '../latency'
import { getDb } from '../storage'
import { runAsActor } from './session'

/** Builds the list row of one purchase. */
function purchaseRow(db: Db, purchaseId: string): PurchaseRow | null {
  const purchase = db.purchases.find((item) => item.id === purchaseId)
  if (!purchase) return null
  const supplier = db.suppliers.find((item) => item.id === purchase.supplierId)
  const author = db.users.find((item) => item.id === purchase.createdById)
  const order = purchase.orderId ? db.orders.find((item) => item.id === purchase.orderId) : undefined
  return {
    purchase,
    supplierName: supplier ? supplier.name : '—',
    createdByName: author ? author.fullName : '—',
    orderNumber: order ? order.number : undefined,
    status: purchaseStatus(db, purchase),
    totalKop: purchaseTotalKop(purchase),
    allocatedKop: purchaseAllocatedKop(db, purchase),
    remainingKop: purchaseRemainingKop(db, purchase),
  }
}

export const purchasesApi: PurchasesApi = {
  /** Newest purchases first. */
  async list() {
    await delay()
    const db = getDb()
    const rows = db.purchases.map((purchase) => purchaseRow(db, purchase.id)!)
    return sortBy(rows, (row) => row.purchase.date).reverse()
  },

  async get(id) {
    await delay()
    const db = getDb()
    const row = purchaseRow(db, id)
    if (!row) return null
    const { purchase } = row

    const items: PurchaseItemRow[] = purchase.items.map((item) => {
      const product = db.products.find((candidate) => candidate.id === item.productId)
      const batch = itemBatch(db, item.id)
      return {
        item,
        productName: product ? product.name : '—',
        unit: product ? product.unit : 'шт',
        totalKop: purchaseItemTotalKop(item),
        allocatedQty: batch ? roundQty(batch.qtyReceived - batch.qtyRemaining) : 0,
        availableQty: batch ? batch.qtyRemaining : 0,
      }
    })

    const history: AuditRow[] = sortBy(
      db.audit.filter((entry) => entry.objectId === purchase.id),
      (entry) => entry.at,
    )
      .reverse()
      .map((entry) => ({
        entry,
        userName: db.users.find((user) => user.id === entry.userId)?.fullName ?? 'Система',
      }))

    const detail: PurchaseDetail = { ...row, items, canCancel: canCancelPurchase(db, purchase), history }
    return detail
  },

  /**
   * Items that carry a `newProduct` get their product created first, inside the
   * same copy of the database: if the purchase is refused afterwards, the copy
   * is thrown away and no orphan product remains (one atomic operation).
   */
  async create(input) {
    await delay()
    return runAsActor((draft, userId) => {
      const items: PurchaseItemInput[] = []
      for (const item of input.items) {
        if ('newProduct' in item) {
          const created = createProduct(draft, item.newProduct, userId)
          if (!created.ok) return created
          items.push({ productId: created.value.id, qty: item.qty, unitPriceKop: item.unitPriceKop, note: item.note })
        } else {
          items.push(item)
        }
      }
      return createPurchase(draft, { ...input, items }, userId)
    })
  },

  async cancel(id, reason) {
    await delay()
    return runAsActor((draft, userId) => cancelPurchase(draft, id, reason, userId))
  },
}
