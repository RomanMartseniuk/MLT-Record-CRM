/**
 * Mock handlers of the `categories` and `suppliers` modules.
 *
 * Both are reference lists: nothing is deleted, only deactivated, so the
 * purchase and allocation history stays intact. The list methods return rows
 * with the numbers the pages show (product counts, purchase totals), already
 * computed and sorted the way the pages present them.
 */

import type { CategoriesApi, SuppliersApi } from '../../contract/client'
import type { CategoryRow, SupplierRow } from '../../contract/dto'
import { createCategory, createSupplier, updateCategory, updateSupplier } from '../engine/catalog'
import { purchaseTotalKop } from '../engine/purchases'
import { sortBy, sum } from '../engine/util'
import { delay } from '../latency'
import { getDb } from '../storage'
import { runAsActor } from './session'

export const categoriesApi: CategoriesApi = {
  async list() {
    await delay()
    const db = getDb()
    const rows: CategoryRow[] = db.categories.map((category) => ({
      ...category,
      productCount: db.products.filter((product) => product.categoryId === category.id).length,
      parentName: category.parentId
        ? (db.categories.find((item) => item.id === category.parentId)?.name ?? null)
        : null,
    }))
    return sortBy(rows, (row) => `${row.kind}|${row.name}`)
  },

  async create(input) {
    await delay()
    return runAsActor((draft, userId) => createCategory(draft, input, userId))
  },

  async update(id, patch) {
    await delay()
    return runAsActor((draft, userId) => updateCategory(draft, id, patch, userId))
  },
}

export const suppliersApi: SuppliersApi = {
  async list() {
    await delay()
    const db = getDb()
    const rows: SupplierRow[] = db.suppliers.map((supplier) => {
      // A cancelled purchase is not a purchase for statistics.
      const purchases = db.purchases.filter((purchase) => purchase.supplierId === supplier.id && !purchase.cancelled)
      const latest = sortBy(purchases, (purchase) => purchase.date).at(-1)
      return {
        ...supplier,
        purchasesCount: purchases.length,
        purchasesTotalKop: sum(purchases.map((purchase) => purchaseTotalKop(purchase))),
        lastPurchaseDate: latest ? latest.date : null,
      }
    })
    return sortBy(rows, (row) => -row.purchasesTotalKop)
  },

  async create(input) {
    await delay()
    return runAsActor((draft, userId) => createSupplier(draft, input, userId))
  },

  async update(id, patch) {
    await delay()
    return runAsActor((draft, userId) => updateSupplier(draft, id, patch, userId))
  },
}
