import { formatMoney, formatQty } from '@/lib/format'
import { uid } from '@/lib/utils'
import { fifoBatches, planFifo, productStock, purchaseTotalKop, roundQty } from './calc'
import { isOrderLocked } from './labels'
import type {
  Allocation,
  AuditAction,
  Batch,
  Category,
  CategoryKind,
  Db,
  Permission,
  Product,
  ProductLink,
  Purchase,
  PurchaseDestination,
  Supplier,
  SyncSource,
  Unit,
  User,
  UserRole,
} from './types'

export type OpResult<T = void> = { ok: true; value: T } | { ok: false; error: string }

function fail(error: string): OpResult<never> {
  return { ok: false, error }
}

function now(): string {
  return new Date().toISOString()
}

/* ─── Журнал ───────────────────────────────────────────────────────── */

interface AuditInput {
  userId: string
  action: AuditAction
  objectType: string
  objectId: string
  objectLabel: string
  before?: string
  after?: string
  reason?: string
}

export function pushAudit(db: Db, input: AuditInput, at?: string): void {
  db.audit.push({
    id: uid('aud'),
    at: at ?? now(),
    userId: input.userId,
    action: input.action,
    objectType: input.objectType,
    objectId: input.objectId,
    objectLabel: input.objectLabel,
    before: input.before,
    after: input.after,
    reason: input.reason,
  })
}

/* ─── Закупівлі ────────────────────────────────────────────────────── */

export interface PurchaseItemInput {
  productId: string
  qty: number
  unitPriceKop: number
  note?: string
}

export interface CreatePurchaseInput {
  date?: string
  supplierId: string
  docNumber?: string
  comment?: string
  hasReceipt?: boolean
  destination: PurchaseDestination
  orderId?: string
  items: PurchaseItemInput[]
}

export interface CreatePurchaseResult {
  purchaseId: string
  allocationIds: string[]
}

/**
 * Створює закупівлю. Призначення «на склад» створює лише партії,
 * призначення «у заявку» одразу створює і партію, і вкладення —
 * у залишок складу така позиція не потрапляє.
 */
export function createPurchase(
  db: Db,
  input: CreatePurchaseInput,
  userId: string,
): OpResult<CreatePurchaseResult> {
  if (input.items.length === 0) return fail('Додайте хоча б одну позицію закупівлі.')
  if (!input.supplierId) return fail('Виберіть постачальника.')
  if (input.destination === 'order' && !input.orderId) return fail('Виберіть заявку для закупівлі.')

  for (const item of input.items) {
    if (!item.productId) return fail('У кожній позиції має бути вибраний товар.')
    if (!(item.qty > 0)) return fail('Кількість у позиції має бути більшою за нуль.')
    if (!(item.unitPriceKop > 0)) return fail('Ціна за одиницю має бути більшою за нуль.')
  }

  const order = input.orderId ? db.orders.find((candidate) => candidate.id === input.orderId) : undefined
  if (input.destination === 'order') {
    if (!order) return fail('Заявку не знайдено.')
    if (isOrderLocked(db, order.rawStatus)) {
      return fail('Заявка закрита: закупівлю напряму в неї оформити не можна.')
    }
  }

  const at = input.date ?? now()
  db.counters.purchase += 1
  const purchaseId = uid('pur')

  const purchase: Purchase = {
    id: purchaseId,
    number: `З-${String(db.counters.purchase).padStart(4, '0')}`,
    date: at,
    supplierId: input.supplierId,
    docNumber: input.docNumber,
    comment: input.comment,
    hasReceipt: input.hasReceipt ?? false,
    destination: input.destination,
    orderId: input.destination === 'order' ? input.orderId : undefined,
    cancelled: false,
    createdById: userId,
    items: input.items.map((item) => ({
      id: uid('pit'),
      productId: item.productId,
      qty: roundQty(item.qty),
      unitPriceKop: item.unitPriceKop,
      note: item.note,
    })),
  }

  db.purchases.push(purchase)

  const allocationIds: string[] = []

  for (const item of purchase.items) {
    const batch: Batch = {
      id: uid('bat'),
      productId: item.productId,
      purchaseId,
      purchaseItemId: item.id,
      qtyReceived: item.qty,
      qtyRemaining: item.qty,
      unitPriceKop: item.unitPriceKop,
      receivedAt: at,
    }
    db.batches.push(batch)

    if (purchase.destination === 'order' && purchase.orderId) {
      batch.qtyRemaining = 0
      const allocation: Allocation = {
        id: uid('alc'),
        orderId: purchase.orderId,
        productId: item.productId,
        qty: item.qty,
        lines: [{ batchId: batch.id, qty: item.qty, unitPriceKop: item.unitPriceKop }],
        totalKop: Math.round(item.qty * item.unitPriceKop),
        createdAt: at,
        createdById: userId,
        status: 'active',
      }
      db.allocations.push(allocation)
      allocationIds.push(allocation.id)
    }
  }

  pushAudit(
    db,
    {
      userId,
      action: 'purchase.create',
      objectType: 'Закупівля',
      objectId: purchaseId,
      objectLabel: purchase.number,
      after: `${purchase.items.length} поз., ${formatMoney(purchaseTotalKop(purchase))}, ${
        purchase.destination === 'order' ? 'у заявку' : 'на склад'
      }`,
    },
    at,
  )

  return { ok: true, value: { purchaseId, allocationIds } }
}

export function cancelPurchase(db: Db, purchaseId: string, reason: string, userId: string): OpResult {
  const purchase = db.purchases.find((item) => item.id === purchaseId)
  if (!purchase) return fail('Закупівлю не знайдено.')
  if (purchase.cancelled) return fail('Закупівля вже скасована.')
  if (!reason.trim()) return fail('Вкажіть причину скасування.')

  const batches = db.batches.filter((batch) => batch.purchaseId === purchaseId)
  const consumed = batches.some((batch) => batch.qtyRemaining < batch.qtyReceived)
  if (consumed) {
    return fail('З цієї закупівлі вже є вкладення. Спочатку поверніть їх на склад.')
  }

  purchase.cancelled = true
  purchase.cancelReason = reason.trim()
  for (const batch of batches) batch.qtyRemaining = 0

  pushAudit(db, {
    userId,
    action: 'purchase.cancel',
    objectType: 'Закупівля',
    objectId: purchaseId,
    objectLabel: purchase.number,
    before: 'активна',
    after: 'скасована',
    reason: reason.trim(),
  })

  return { ok: true, value: undefined }
}

/* ─── Вкладення ────────────────────────────────────────────────────── */

export interface AddAllocationInput {
  orderId: string
  productId: string
  qty: number
  reason?: string
  at?: string
}

/** Додає вкладення: ціна рахується автоматично за FIFO, залишок списується одразу. */
export function addAllocation(db: Db, input: AddAllocationInput, userId: string): OpResult<Allocation> {
  const order = db.orders.find((item) => item.id === input.orderId)
  if (!order) return fail('Заявку не знайдено.')

  const product = db.products.find((item) => item.id === input.productId)
  if (!product) return fail('Товар не знайдено.')

  const qty = roundQty(input.qty)
  if (!(qty > 0)) return fail('Кількість має бути більшою за нуль.')

  const locked = isOrderLocked(db, order.rawStatus)
  const reason = input.reason?.trim()
  if (locked && !reason) return fail('Для закритої заявки потрібно вказати причину зміни.')

  const stock = productStock(db, input.productId)
  if (qty > stock.qty) {
    return fail(
      `На складі доступно лише ${formatQty(stock.qty, product.unit)}. Оформіть закупівлю, щоб поповнити залишок.`,
    )
  }

  const plan = planFifo(fifoBatches(db, input.productId), qty)
  if (plan.shortfall > 0) return fail('Недостатньо залишку на складі.')

  for (const line of plan.lines) {
    const batch = db.batches.find((item) => item.id === line.batchId)
    if (!batch) return fail('Партію не знайдено.')
    batch.qtyRemaining = roundQty(batch.qtyRemaining - line.qty)
  }

  const at = input.at ?? now()
  const allocation: Allocation = {
    id: uid('alc'),
    orderId: input.orderId,
    productId: input.productId,
    qty,
    lines: plan.lines,
    totalKop: plan.totalKop,
    createdAt: at,
    createdById: userId,
    status: 'active',
    reason,
  }
  db.allocations.push(allocation)

  pushAudit(
    db,
    {
      userId,
      action: 'allocation.create',
      objectType: 'Вкладення',
      objectId: allocation.id,
      objectLabel: `${product.name} → ${order.number}`,
      after: `${formatQty(qty, product.unit)}, ${formatMoney(plan.totalKop)}`,
      reason,
    },
    at,
  )

  return { ok: true, value: allocation }
}

/**
 * Повертає вкладення на склад або скасовує його.
 * Кількість і вартість повертаються саме в ті партії, з яких були взяті.
 */
export function releaseAllocation(
  db: Db,
  allocationId: string,
  mode: 'returned' | 'cancelled',
  userId: string,
  reason?: string,
): OpResult {
  const allocation = db.allocations.find((item) => item.id === allocationId)
  if (!allocation) return fail('Вкладення не знайдено.')
  if (allocation.status !== 'active') return fail('Це вкладення вже не активне.')

  const order = db.orders.find((item) => item.id === allocation.orderId)
  if (!order) return fail('Заявку не знайдено.')

  const trimmed = reason?.trim()
  if (isOrderLocked(db, order.rawStatus) && !trimmed) {
    return fail('Для закритої заявки потрібно вказати причину зміни.')
  }

  for (const line of allocation.lines) {
    const batch = db.batches.find((item) => item.id === line.batchId)
    if (!batch) continue
    batch.qtyRemaining = roundQty(batch.qtyRemaining + line.qty)
  }

  allocation.status = mode
  allocation.reason = trimmed ?? allocation.reason

  const product = db.products.find((item) => item.id === allocation.productId)
  pushAudit(db, {
    userId,
    action: mode === 'returned' ? 'allocation.return' : 'allocation.cancel',
    objectType: 'Вкладення',
    objectId: allocation.id,
    objectLabel: `${product ? product.name : 'Товар'} → ${order.number}`,
    before: `активне, ${formatMoney(allocation.totalKop)}`,
    after: mode === 'returned' ? 'повернуто на склад' : 'скасовано',
    reason: trimmed,
  })

  return { ok: true, value: undefined }
}

/**
 * Перенесення вкладення на іншу заявку.
 * Склад не змінюється, ціни зберігаються — загальна сума закупівель не росте.
 */
export function transferAllocation(
  db: Db,
  allocationId: string,
  toOrderId: string,
  userId: string,
  reason?: string,
): OpResult {
  const allocation = db.allocations.find((item) => item.id === allocationId)
  if (!allocation) return fail('Вкладення не знайдено.')
  if (allocation.status !== 'active') return fail('Це вкладення вже не активне.')
  if (allocation.orderId === toOrderId) return fail('Це та сама заявка.')

  const from = db.orders.find((item) => item.id === allocation.orderId)
  const to = db.orders.find((item) => item.id === toOrderId)
  if (!from || !to) return fail('Заявку не знайдено.')

  const trimmed = reason?.trim()
  if ((isOrderLocked(db, from.rawStatus) || isOrderLocked(db, to.rawStatus)) && !trimmed) {
    return fail('Для закритої заявки потрібно вказати причину зміни.')
  }

  allocation.transferredFromOrderId = allocation.orderId
  allocation.orderId = toOrderId
  allocation.reason = trimmed ?? allocation.reason

  const product = db.products.find((item) => item.id === allocation.productId)
  pushAudit(db, {
    userId,
    action: 'allocation.transfer',
    objectType: 'Вкладення',
    objectId: allocation.id,
    objectLabel: product ? product.name : 'Товар',
    before: from.number,
    after: to.number,
    reason: trimmed,
  })

  return { ok: true, value: undefined }
}

/* ─── Склад ────────────────────────────────────────────────────────── */

/** Ручне коригування залишку. Причина обов'язкова, запис іде в журнал. */
export function adjustStock(
  db: Db,
  productId: string,
  deltaQty: number,
  reason: string,
  userId: string,
): OpResult {
  const product = db.products.find((item) => item.id === productId)
  if (!product) return fail('Товар не знайдено.')
  if (!reason.trim()) return fail('Вкажіть причину коригування.')

  const delta = roundQty(deltaQty)
  if (delta === 0) return fail('Вкажіть кількість, відмінну від нуля.')

  const stock = productStock(db, productId)

  if (delta > 0) {
    const price = stock.avgPriceKop > 0 ? stock.avgPriceKop : 0
    db.batches.push({
      id: uid('bat'),
      productId,
      purchaseId: '',
      purchaseItemId: '',
      qtyReceived: delta,
      qtyRemaining: delta,
      unitPriceKop: price,
      receivedAt: now(),
      adjustment: true,
    })
  } else {
    const need = roundQty(-delta)
    if (need > stock.qty) {
      return fail('Відʼємні залишки заборонені: не можна списати більше, ніж є на складі.')
    }
    const plan = planFifo(fifoBatches(db, productId), need)
    for (const line of plan.lines) {
      const batch = db.batches.find((item) => item.id === line.batchId)
      if (!batch) continue
      batch.qtyRemaining = roundQty(batch.qtyRemaining - line.qty)
    }
  }

  const after = productStock(db, productId)
  pushAudit(db, {
    userId,
    action: 'inventory.adjust',
    objectType: 'Залишок',
    objectId: productId,
    objectLabel: product.name,
    before: formatQty(stock.qty, product.unit),
    after: formatQty(after.qty, product.unit),
    reason: reason.trim(),
  })

  return { ok: true, value: undefined }
}

/* ─── Довідники ────────────────────────────────────────────────────── */

export interface ProductInput {
  name: string
  categoryId: string
  unit: Unit
  links: ProductLink[]
}

export function createProduct(db: Db, input: ProductInput, userId: string): OpResult<Product> {
  const name = input.name.trim()
  if (!name) return fail('Вкажіть назву товару.')
  if (!input.categoryId) return fail('Виберіть категорію.')

  const exists = db.products.some((item) => item.name.toLowerCase() === name.toLowerCase())
  if (exists) return fail('Товар з такою назвою вже є на складі.')

  const product: Product = {
    id: uid('prd'),
    name,
    categoryId: input.categoryId,
    unit: input.unit,
    photoTone: db.products.length % 5,
    links: input.links,
    active: true,
  }
  db.products.push(product)

  pushAudit(db, {
    userId,
    action: 'product.create',
    objectType: 'Товар',
    objectId: product.id,
    objectLabel: product.name,
    after: 'створено',
  })

  return { ok: true, value: product }
}

export function updateProduct(db: Db, productId: string, patch: Partial<ProductInput>, userId: string): OpResult {
  const product = db.products.find((item) => item.id === productId)
  if (!product) return fail('Товар не знайдено.')

  const before = `${product.name}, ${product.links.length} поси.`
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) return fail('Назва не може бути порожньою.')
    product.name = name
  }
  if (patch.categoryId !== undefined) product.categoryId = patch.categoryId
  if (patch.unit !== undefined) product.unit = patch.unit
  if (patch.links !== undefined) product.links = patch.links

  pushAudit(db, {
    userId,
    action: 'product.update',
    objectType: 'Товар',
    objectId: product.id,
    objectLabel: product.name,
    before,
    after: `${product.name}, ${product.links.length} поси.`,
  })

  return { ok: true, value: undefined }
}

export interface SupplierInput {
  name: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  comment?: string
}

export function createSupplier(db: Db, input: SupplierInput, userId: string): OpResult<Supplier> {
  const name = input.name.trim()
  if (!name) return fail('Вкажіть назву постачальника.')

  const supplier: Supplier = {
    id: uid('sup'),
    name,
    contact: input.contact,
    phone: input.phone,
    email: input.email,
    address: input.address,
    comment: input.comment,
    active: true,
  }
  db.suppliers.push(supplier)

  pushAudit(db, {
    userId,
    action: 'supplier.create',
    objectType: 'Постачальник',
    objectId: supplier.id,
    objectLabel: supplier.name,
    after: 'створено',
  })

  return { ok: true, value: supplier }
}

export function updateSupplier(
  db: Db,
  supplierId: string,
  patch: Partial<SupplierInput> & { active?: boolean },
  userId: string,
): OpResult {
  const supplier = db.suppliers.find((item) => item.id === supplierId)
  if (!supplier) return fail('Постачальника не знайдено.')

  const before = supplier.active ? 'активний' : 'неактивний'
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) return fail('Назва не може бути порожньою.')
    supplier.name = name
  }
  if (patch.contact !== undefined) supplier.contact = patch.contact
  if (patch.phone !== undefined) supplier.phone = patch.phone
  if (patch.email !== undefined) supplier.email = patch.email
  if (patch.address !== undefined) supplier.address = patch.address
  if (patch.comment !== undefined) supplier.comment = patch.comment
  if (patch.active !== undefined) supplier.active = patch.active

  pushAudit(db, {
    userId,
    action: 'supplier.update',
    objectType: 'Постачальник',
    objectId: supplier.id,
    objectLabel: supplier.name,
    before,
    after: supplier.active ? 'активний' : 'неактивний',
  })

  return { ok: true, value: undefined }
}

export interface CategoryInput {
  name: string
  kind: CategoryKind
  parentId: string | null
}

export function createCategory(db: Db, input: CategoryInput, userId: string): OpResult<Category> {
  const name = input.name.trim()
  if (!name) return fail('Вкажіть назву категорії.')

  const category: Category = {
    id: uid('cat'),
    name,
    kind: input.kind,
    parentId: input.parentId,
    active: true,
  }
  db.categories.push(category)

  pushAudit(db, {
    userId,
    action: 'category.create',
    objectType: 'Категорія',
    objectId: category.id,
    objectLabel: category.name,
    after: 'створено',
  })

  return { ok: true, value: category }
}

export function updateCategory(
  db: Db,
  categoryId: string,
  patch: Partial<CategoryInput> & { active?: boolean },
  userId: string,
): OpResult {
  const category = db.categories.find((item) => item.id === categoryId)
  if (!category) return fail('Категорію не знайдено.')

  const before = `${category.name}, ${category.active ? 'активна' : 'неактивна'}`
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) return fail('Назва не може бути порожньою.')
    category.name = name
  }
  if (patch.parentId !== undefined) category.parentId = patch.parentId
  if (patch.active !== undefined) category.active = patch.active

  pushAudit(db, {
    userId,
    action: 'category.update',
    objectType: 'Категорія',
    objectId: category.id,
    objectLabel: category.name,
    before,
    after: `${category.name}, ${category.active ? 'активна' : 'неактивна'}`,
  })

  return { ok: true, value: undefined }
}

/* ─── Користувачі ──────────────────────────────────────────────────── */

export interface UserInput {
  fullName: string
  email: string
  role: UserRole
  extraPermissions: Permission[]
}

export function createUser(db: Db, input: UserInput, userId: string): OpResult<User> {
  const fullName = input.fullName.trim()
  const email = input.email.trim()
  if (!fullName) return fail('Вкажіть імʼя користувача.')
  if (!email.includes('@')) return fail('Вкажіть коректну електронну пошту.')
  if (db.users.some((item) => item.email.toLowerCase() === email.toLowerCase())) {
    return fail('Користувач з такою поштою вже існує.')
  }

  const user: User = {
    id: uid('usr'),
    fullName,
    email,
    role: input.role,
    extraPermissions: input.extraPermissions,
    blocked: false,
  }
  db.users.push(user)

  pushAudit(db, {
    userId,
    action: 'user.create',
    objectType: 'Користувач',
    objectId: user.id,
    objectLabel: user.fullName,
    after: 'створено',
  })

  return { ok: true, value: user }
}

export function updateUser(
  db: Db,
  targetId: string,
  patch: { role?: UserRole; extraPermissions?: Permission[]; blocked?: boolean },
  userId: string,
): OpResult {
  const user = db.users.find((item) => item.id === targetId)
  if (!user) return fail('Користувача не знайдено.')

  const before = `${user.role}, ${user.extraPermissions.length} дод. прав, ${user.blocked ? 'заблокований' : 'активний'}`
  if (patch.role !== undefined) user.role = patch.role
  if (patch.extraPermissions !== undefined) user.extraPermissions = patch.extraPermissions
  if (patch.blocked !== undefined) user.blocked = patch.blocked

  pushAudit(db, {
    userId,
    action: 'user.update',
    objectType: 'Користувач',
    objectId: user.id,
    objectLabel: user.fullName,
    before,
    after: `${user.role}, ${user.extraPermissions.length} дод. прав, ${user.blocked ? 'заблокований' : 'активний'}`,
  })

  return { ok: true, value: undefined }
}

/* ─── Інтеграція з RO App (симуляція) ──────────────────────────────── */

export interface SyncResult {
  added: number
  updated: number
}

const STATUS_FLOW: Record<string, string> = {
  'in-queue': 'in-progress',
  'in-progress': 'ready',
  ready: 'closed',
}

/**
 * Симуляція оновлення даних з RO App.
 * Усі три способи (вебхук, кнопка, нічний запуск) ідуть через одну логіку
 * і пишуть подію в журнал синхронізації з позначкою джерела.
 */
export function syncRoApp(db: Db, source: SyncSource, userId: string): OpResult<SyncResult> {
  const at = now()
  let added = 0
  let updated = 0

  if (source === 'webhook') {
    const candidates = db.orders.filter((order) => STATUS_FLOW[order.rawStatus] !== undefined)
    if (candidates.length === 0) {
      db.syncLog.unshift({
        id: uid('syn'),
        at,
        source,
        ok: true,
        added: 0,
        updated: 0,
        message: 'Подія без змін: усі заявки вже закриті.',
      })
      db.lastSyncAt = at
      return { ok: true, value: { added: 0, updated: 0 } }
    }
    const index = Math.floor(Math.random() * candidates.length)
    const order = candidates[index]
    order.rawStatus = STATUS_FLOW[order.rawStatus]
    order.syncedAt = at
    updated = 1
    db.syncLog.unshift({
      id: uid('syn'),
      at,
      source,
      ok: true,
      added: 0,
      updated,
      message: `Заявка ${order.number}: новий статус «${order.rawStatus}».`,
    })
  } else {
    for (const order of db.orders) order.syncedAt = at
    updated = db.orders.length
    db.syncLog.unshift({
      id: uid('syn'),
      at,
      source,
      ok: true,
      added,
      updated,
      message: `Оновлено заявки, клієнтів і техніку. Довідники статусів і типів перечитано.`,
    })
  }

  db.lastSyncAt = at
  pushAudit(db, {
    userId,
    action: 'integration.sync',
    objectType: 'RO App',
    objectId: 'integration',
    objectLabel: source === 'webhook' ? 'Вебхук' : source === 'nightly' ? 'Нічний запуск' : 'Глобальне оновлення',
    after: `додано ${added}, оновлено ${updated}`,
  })

  return { ok: true, value: { added, updated } }
}
