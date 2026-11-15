/**
 * The API contract: everything the UI can ask of the server.
 *
 * One interface per backend module (see docs/03-backend-plan.md). The mock
 * server (`api/mock`) implements it now; a real HTTP client will implement
 * the very same interface later, and no page has to change.
 *
 * Conventions:
 * - Every method is asynchronous, like a network call.
 * - The acting user is NOT a parameter: the server knows it from the session
 *   (a JWT in the real server).
 * - Reads return data or `null` when an entity does not exist.
 * - Writes return `ApiResult`; business-rule violations are `ok: false`.
 */

import type {
  AddAllocationInput,
  AdjustStockInput,
  AnalyticsData,
  AnalyticsFilters,
  AuditFilters,
  AuditRow,
  CategoryInput,
  CategoryPatch,
  CategoryRow,
  CreatePurchaseInput,
  CreatePurchaseResult,
  DashboardData,
  DateRange,
  FifoPreview,
  IntegrationStatus,
  OrderDetail,
  OrderFilters,
  OrderRow,
  ProductDetail,
  ProductInput,
  ProductPatch,
  PurchaseDetail,
  PurchaseRow,
  Reference,
  Session,
  StockRow,
  StockTotals,
  SupplierInput,
  SupplierPatch,
  SupplierRow,
  SyncResult,
  UserInput,
  UserPatch,
} from './dto'
import type { ApiResult } from './result'
import type { Allocation, Category, Product, Settings, Supplier, SyncSource, User } from './types'

export interface AuthApi {
  /** The current session, or null when nobody is signed in. */
  me(): Promise<Session | null>
  /** Active users offered by the demo user switcher. */
  listDemoUsers(): Promise<User[]>
  /** Signs in by e-mail and password (the prototype does not check the password). */
  login(email: string, password: string): Promise<ApiResult<Session>>
  /** Demo shortcut: signs in as the given user. A real server does not have it. */
  loginAsDemo(userId: string): Promise<ApiResult<Session>>
  logout(): Promise<void>
}

export interface UsersApi {
  list(): Promise<User[]>
  create(input: UserInput): Promise<ApiResult<User>>
  update(id: string, patch: UserPatch): Promise<ApiResult>
}

export interface CategoriesApi {
  /** Categories sorted by kind and name, with product counts. */
  list(): Promise<CategoryRow[]>
  create(input: CategoryInput): Promise<ApiResult<Category>>
  update(id: string, patch: CategoryPatch): Promise<ApiResult>
}

export interface SuppliersApi {
  /** Suppliers with purchase totals, the biggest total first. */
  list(): Promise<SupplierRow[]>
  create(input: SupplierInput): Promise<ApiResult<Supplier>>
  update(id: string, patch: SupplierPatch): Promise<ApiResult>
}

/** Products and everything about their stock (batches, FIFO, adjustments). */
export interface WarehouseApi {
  listStock(): Promise<StockRow[]>
  getProduct(id: string): Promise<ProductDetail | null>
  /** Shows how a write-off of `qty` would be split across batches. */
  previewFifo(productId: string, qty: number): Promise<FifoPreview>
  totals(): Promise<StockTotals>
  createProduct(input: ProductInput): Promise<ApiResult<Product>>
  updateProduct(id: string, patch: ProductPatch): Promise<ApiResult>
  adjustStock(input: AdjustStockInput): Promise<ApiResult>
}

export interface PurchasesApi {
  list(): Promise<PurchaseRow[]>
  get(id: string): Promise<PurchaseDetail | null>
  create(input: CreatePurchaseInput): Promise<ApiResult<CreatePurchaseResult>>
  cancel(id: string, reason: string): Promise<ApiResult>
}

/** Orders are read-only here: they come from RO App. */
export interface OrdersApi {
  list(filters?: OrderFilters): Promise<OrderRow[]>
  get(id: string): Promise<OrderDetail | null>
}

export interface AllocationsApi {
  add(input: AddAllocationInput): Promise<ApiResult<Allocation>>
  /** Puts the stock back ('returned') or voids a mistaken allocation ('cancelled'). */
  release(id: string, mode: 'returned' | 'cancelled', reason?: string): Promise<ApiResult>
  transfer(id: string, toOrderId: string, reason?: string): Promise<ApiResult>
}

export interface ReportsApi {
  dashboard(range: DateRange): Promise<DashboardData>
  analytics(filters: AnalyticsFilters): Promise<AnalyticsData>
}

export interface AuditApi {
  list(filters: AuditFilters): Promise<AuditRow[]>
}

export interface IntegrationApi {
  status(): Promise<IntegrationStatus>
  sync(source: SyncSource): Promise<ApiResult<SyncResult>>
}

export interface SettingsApi {
  get(): Promise<Settings>
  /** Applies the patch and returns the settings as they are now. */
  update(patch: Partial<Settings>): Promise<Settings>
  /** Demo only: restores the initial demo data. A real server does not have it. */
  resetDemoData(): Promise<void>
}

export interface ReferenceApi {
  get(): Promise<Reference>
}

/** The whole contract. */
export interface ApiClient {
  auth: AuthApi
  users: UsersApi
  categories: CategoriesApi
  suppliers: SuppliersApi
  warehouse: WarehouseApi
  purchases: PurchasesApi
  orders: OrdersApi
  allocations: AllocationsApi
  reports: ReportsApi
  audit: AuditApi
  integration: IntegrationApi
  settings: SettingsApi
  reference: ReferenceApi
}
