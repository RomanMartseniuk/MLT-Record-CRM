/**
 * Entity types of the API contract.
 *
 * These are the shapes that travel between the UI and the server (mock or
 * real). They describe business data only: nothing here depends on how the
 * data is stored. The internal storage container (`Db`) is NOT part of the
 * contract; it lives next to the mock engine.
 *
 * Money is always integer kopecks in fields named `*Kop`.
 * Dates are ISO 8601 strings.
 */

/* ─── Users and permissions ────────────────────────────────────────── */

export type UserRole = 'admin' | 'executor'

export type Permission =
  | 'purchases.view'
  | 'purchases.create'
  | 'allocations.create'
  | 'allocations.edit_closed'
  | 'inventory.manage'
  | 'reports.view'
  | 'reports.export'
  | 'users.manage'
  | 'settings.manage'

export interface User {
  id: string
  fullName: string
  email: string
  role: UserRole
  /** Individual permissions an administrator granted on top of the role. */
  extraPermissions: Permission[]
  blocked: boolean
  /** Link to an RO App employee, if any. */
  roAppName?: string
}

/* ─── Data from RO App (read only) ─────────────────────────────────── */

/** Local status enum. A raw RO App status string is mapped onto it. */
export type OrderStatusCode = 'inQueue' | 'inWork' | 'done' | 'closed'

export interface StatusMapping {
  /** The string that comes from RO App. */
  raw: string
  /** Local value, or null when the status is unknown to us. */
  local: OrderStatusCode | null
  label: string
}

export interface OrderType {
  id: string
  name: string
}

export interface Client {
  id: string
  externalId: string
  isOrganization: boolean
  name: string
  phones: string[]
  email?: string
}

export interface Asset {
  id: string
  externalId: string
  title: string
  type: string
  brand: string
  model: string
  modification?: string
}

export interface Order {
  id: string
  externalId: string
  number: string
  /** Status exactly as RO App sent it. */
  rawStatus: string
  typeId: string
  createdAt: string
  dueDate: string
  doneAt?: string
  closedAt?: string
  clientId: string
  assetId: string
  managerName: string
  engineerName: string
  malfunction: string
  managerNotes?: string
  engineerNotes?: string
  accessories?: string
  /** When the order was last refreshed from RO App. */
  syncedAt: string
}

/* ─── Reference data ───────────────────────────────────────────────── */

export type CategoryKind = 'product' | 'expense'

export interface Category {
  id: string
  name: string
  kind: CategoryKind
  parentId: string | null
  active: boolean
}

export type Unit = 'шт' | 'л' | 'кг' | 'м'

export interface ProductLink {
  id: string
  label: string
  url: string
}

export interface Product {
  id: string
  name: string
  categoryId: string
  unit: Unit
  /** Neutral tile instead of a photo: shade index 0–4. */
  photoTone: number
  links: ProductLink[]
  active: boolean
}

export interface Supplier {
  id: string
  name: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  comment?: string
  active: boolean
}

/* ─── Purchases, batches, allocations ──────────────────────────────── */

export type PurchaseDestination = 'warehouse' | 'order'

export interface PurchaseItem {
  id: string
  productId: string
  qty: number
  unitPriceKop: number
  note?: string
}

export interface Purchase {
  id: string
  number: string
  date: string
  supplierId: string
  docNumber?: string
  comment?: string
  hasReceipt: boolean
  destination: PurchaseDestination
  /** Set when the purchase goes straight into an order. */
  orderId?: string
  cancelled: boolean
  cancelReason?: string
  createdById: string
  items: PurchaseItem[]
}

export type PurchaseStatus = 'new' | 'partial' | 'full' | 'cancelled'

/**
 * A batch is one receipt of a product at a specific price.
 * The same product bought at different prices forms different batches.
 */
export interface Batch {
  id: string
  productId: string
  purchaseId: string
  purchaseItemId: string
  qtyReceived: number
  qtyRemaining: number
  unitPriceKop: number
  receivedAt: string
  /** True for a batch created by a manual stock adjustment. */
  adjustment?: boolean
}

/** One FIFO write-off line: how much was taken from which batch, at what price. */
export interface AllocationLine {
  batchId: string
  qty: number
  unitPriceKop: number
}

export type AllocationStatus = 'active' | 'returned' | 'cancelled'

export interface Allocation {
  id: string
  orderId: string
  productId: string
  qty: number
  lines: AllocationLine[]
  totalKop: number
  createdAt: string
  createdById: string
  status: AllocationStatus
  /** Reason, mandatory for operations on a closed order. */
  reason?: string
  /** Set when the allocation was moved from another order. */
  transferredFromOrderId?: string
}

/* ─── Audit log and integration ────────────────────────────────────── */

export type AuditAction =
  | 'purchase.create'
  | 'purchase.cancel'
  | 'allocation.create'
  | 'allocation.return'
  | 'allocation.cancel'
  | 'allocation.transfer'
  | 'inventory.adjust'
  | 'product.create'
  | 'product.update'
  | 'supplier.create'
  | 'supplier.update'
  | 'category.create'
  | 'category.update'
  | 'user.create'
  | 'user.update'
  | 'integration.sync'

export interface AuditEntry {
  id: string
  at: string
  userId: string
  action: AuditAction
  objectType: string
  objectId: string
  objectLabel: string
  before?: string
  after?: string
  reason?: string
}

export type SyncSource = 'webhook' | 'manual' | 'nightly'

export interface SyncLogEntry {
  id: string
  at: string
  source: SyncSource
  ok: boolean
  added: number
  updated: number
  message?: string
}

/* ─── Settings ─────────────────────────────────────────────────────── */

export interface Settings {
  orgName: string
  currency: string
  timeZone: string
  dateFormat: string
  nightlySyncTime: string
  webhookUrl: string
  webhookEnabled: boolean
}
