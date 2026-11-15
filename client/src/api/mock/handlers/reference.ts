/**
 * Mock handler of the `reference` module: lists the pages need for filters
 * and labels (order types, the RO App status mapping, asset types).
 */

import type { ReferenceApi } from '../../contract/client'
import { orderStatusCode } from '../engine/status'
import { delay } from '../latency'
import { getDb } from '../storage'

export const referenceApi: ReferenceApi = {
  async get() {
    await delay()
    const db = getDb()
    const assetTypes = Array.from(new Set(db.assets.map((asset) => asset.type))).sort()
    // Raw RO App statuses that have no local mapping: shown as is and flagged to the admin.
    const unmappedStatuses = Array.from(
      new Set(db.orders.map((order) => order.rawStatus).filter((raw) => orderStatusCode(db, raw) === null)),
    ).sort()
    return {
      orderTypes: db.orderTypes,
      statusMappings: db.statusMappings,
      assetTypes,
      unmappedStatuses,
      employees: db.users.map((user) => ({ id: user.id, name: user.fullName })),
      categories: db.categories
        .filter((category) => category.kind === 'product')
        .map((category) => ({ id: category.id, name: category.name })),
      suppliers: db.suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name })),
    }
  },
}
