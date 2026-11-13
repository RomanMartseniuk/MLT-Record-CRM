/* ─── Користувачі та права ─────────────────────────────────────────── */

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
  /** Індивідуальні права, які адміністратор видав поверх ролі. */
  extraPermissions: Permission[]
  blocked: boolean
  /** Зв'язок зі співробітником RO App, якщо є. */
  roAppName?: string
}

/* ─── Дані з RO App (тільки читання) ───────────────────────────────── */

/** Локальний enum статусів. Рядок із RO App мапиться сюди. */
export type OrderStatusCode = 'inQueue' | 'inWork' | 'done' | 'closed'

export interface StatusMapping {
  /** Рядок, який приходить з RO App. */
  raw: string
  /** Локальне значення або null, якщо значення невідоме. */
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
  /** Як прийшло з RO App. */
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
  /** Коли заявку останній раз оновлювали з RO App. */
  syncedAt: string
}

/* ─── Довідники ────────────────────────────────────────────────────── */

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
  /** Нейтральна плитка замість фото: індекс відтінку 0–4. */
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

/* ─── Закупівлі, партії, вкладення ─────────────────────────────────── */

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
  /** Заповнено, якщо закупівля йде напряму в заявку. */
  orderId?: string
  cancelled: boolean
  cancelReason?: string
  createdById: string
  items: PurchaseItem[]
}

export type PurchaseStatus = 'new' | 'partial' | 'full' | 'cancelled'

/**
 * Партія — поступлення товару з конкретною ціною.
 * Один і той самий товар за різними цінами утворює різні партії.
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
  /** true для партії, створеної ручним коригуванням залишку. */
  adjustment?: boolean
}

/** Рядок списання за FIFO: скільки взято з якої партії та за якою ціною. */
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
  /** Причина, обов'язкова для операцій із закритою заявкою. */
  reason?: string
  /** Якщо вкладення перенесли з іншої заявки. */
  transferredFromOrderId?: string
}

/* ─── Журнал та інтеграція ─────────────────────────────────────────── */

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

/* ─── Налаштування та сховище ──────────────────────────────────────── */

export interface Settings {
  orgName: string
  currency: string
  timeZone: string
  dateFormat: string
  nightlySyncTime: string
  webhookUrl: string
  webhookEnabled: boolean
}

export interface Db {
  users: User[]
  orderTypes: OrderType[]
  statusMappings: StatusMapping[]
  clients: Client[]
  assets: Asset[]
  orders: Order[]
  categories: Category[]
  products: Product[]
  suppliers: Supplier[]
  purchases: Purchase[]
  batches: Batch[]
  allocations: Allocation[]
  audit: AuditEntry[]
  syncLog: SyncLogEntry[]
  settings: Settings
  lastSyncAt: string | null
  counters: {
    purchase: number
  }
}
