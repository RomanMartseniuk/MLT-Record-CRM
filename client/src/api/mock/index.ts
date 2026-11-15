/**
 * The simulated server: an `ApiClient` implementation over local storage.
 *
 * To connect a real backend, write an HTTP implementation of `ApiClient`
 * and export it from `api/active-client.ts` instead of this one. Nothing
 * outside `src/api` imports this folder directly (an ESLint rule guards that).
 */

import type { ApiClient } from '../contract/client'
import { allocationsApi } from './handlers/allocations'
import { auditApi } from './handlers/audit'
import { authApi } from './handlers/auth'
import { categoriesApi, suppliersApi } from './handlers/catalog'
import { integrationApi } from './handlers/integration'
import { ordersApi } from './handlers/orders'
import { purchasesApi } from './handlers/purchases'
import { referenceApi } from './handlers/reference'
import { reportsApi } from './handlers/reports'
import { settingsApi } from './handlers/settings'
import { usersApi } from './handlers/users'
import { warehouseApi } from './handlers/warehouse'

export const api: ApiClient = {
  auth: authApi,
  users: usersApi,
  categories: categoriesApi,
  suppliers: suppliersApi,
  warehouse: warehouseApi,
  purchases: purchasesApi,
  orders: ordersApi,
  allocations: allocationsApi,
  reports: reportsApi,
  audit: auditApi,
  integration: integrationApi,
  settings: settingsApi,
  reference: referenceApi,
}
