/**
 * Mock handler of the `orders` module.
 *
 * Orders come from RO App and are READ-ONLY here: nothing in this module
 * changes them. What this system adds is the cost, computed from the
 * allocations of the order. Rows already contain the display names, the
 * local status and the "locked" flag, so a page never maps raw RO App
 * values itself.
 */

import type { OrdersApi } from '../../contract/client'
import type { AllocationRow, OrderDetail, OrderRow } from '../../contract/dto'
import type { Allocation } from '../../contract/types'
import {
  orderAllocationHistory,
  orderAllocations,
  orderCostByCategory,
  orderCostKop,
  orderLastOperationAt,
} from '../engine/allocations'
import { isOrderLocked, orderStatusCode, orderStatusLabel } from '../engine/status'
import type { Db } from '../engine/types'
import { delay } from '../latency'
import { getDb } from '../storage'

/** Builds the list row of one order. */
function orderRow(db: Db, orderId: string): OrderRow | null {
  const order = db.orders.find((item) => item.id === orderId)
  if (!order) return null
  const client = db.clients.find((item) => item.id === order.clientId)
  const asset = db.assets.find((item) => item.id === order.assetId)
  const type = db.orderTypes.find((item) => item.id === order.typeId)
  return {
    order,
    clientName: client ? client.name : '—',
    assetTitle: asset ? asset.title : '—',
    assetModel: asset ? asset.model : '—',
    typeName: type ? type.name : '—',
    statusCode: orderStatusCode(db, order.rawStatus),
    statusLabel: orderStatusLabel(db, order.rawStatus),
    locked: isOrderLocked(db, order.rawStatus),
    costKop: orderCostKop(db, order.id),
    lastOperationAt: orderLastOperationAt(db, order.id),
    allocationsCount: orderAllocations(db, order.id).length,
  }
}

/** Adds product, category, author, "moved from" and source purchase names to an allocation. */
function allocationRow(db: Db, allocation: Allocation): AllocationRow {
  const product = db.products.find((item) => item.id === allocation.productId)
  const category = product ? db.categories.find((item) => item.id === product.categoryId) : undefined
  const author = db.users.find((item) => item.id === allocation.createdById)
  const from = allocation.transferredFromOrderId
    ? db.orders.find((item) => item.id === allocation.transferredFromOrderId)
    : undefined

  // The purchases the written-off batches came from (an adjustment batch has none).
  const purchaseIds = new Set<string>()
  for (const line of allocation.lines) {
    const batch = db.batches.find((item) => item.id === line.batchId)
    if (batch && batch.purchaseId) purchaseIds.add(batch.purchaseId)
  }
  const sourcePurchases = Array.from(purchaseIds).flatMap((purchaseId) => {
    const purchase = db.purchases.find((item) => item.id === purchaseId)
    return purchase ? [{ id: purchase.id, number: purchase.number }] : []
  })

  return {
    allocation,
    productName: product ? product.name : 'Товар',
    categoryName: category ? category.name : '—',
    unit: product ? product.unit : 'шт',
    createdByName: author ? author.fullName : 'Невідомо',
    transferredFromOrderNumber: from ? from.number : undefined,
    sourcePurchases,
  }
}

export const ordersApi: OrdersApi = {
  async list(filters) {
    await delay()
    const db = getDb()
    const needle = filters?.search?.trim().toLowerCase()
    const rows = db.orders.map((order) => orderRow(db, order.id)!)
    if (!needle) return rows
    // Free-text search over what a master remembers about an order.
    return rows.filter((row) => {
      const asset = db.assets.find((item) => item.id === row.order.assetId)
      const haystack = [
        row.order.number,
        row.clientName,
        row.assetTitle,
        asset?.brand,
        asset?.model,
        row.order.malfunction,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  },

  async get(id) {
    await delay()
    const db = getDb()
    const row = orderRow(db, id)
    if (!row) return null
    const detail: OrderDetail = {
      ...row,
      client: db.clients.find((item) => item.id === row.order.clientId),
      asset: db.assets.find((item) => item.id === row.order.assetId),
      allocations: orderAllocations(db, id).map((allocation) => allocationRow(db, allocation)),
      history: orderAllocationHistory(db, id).map((allocation) => allocationRow(db, allocation)),
      costByCategory: orderCostByCategory(db, id),
    }
    return detail
  },
}
