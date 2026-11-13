import type {
  AllocationStatus,
  AuditAction,
  Db,
  OrderStatusCode,
  PurchaseDestination,
  PurchaseStatus,
  SyncSource,
} from './types'

export const ORDER_STATUS_LABELS: Record<OrderStatusCode, string> = {
  inQueue: 'В черзі',
  inWork: 'В роботі',
  done: 'Готово',
  closed: 'Закрито',
}

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  new: 'Нова',
  partial: 'Частково розподілена',
  full: 'Повністю розподілена',
  cancelled: 'Скасована',
}

export const DESTINATION_LABELS: Record<PurchaseDestination, string> = {
  warehouse: 'На склад',
  order: 'У заявку',
}

export const ALLOCATION_STATUS_LABELS: Record<AllocationStatus, string> = {
  active: 'Активне',
  returned: 'Повернуто на склад',
  cancelled: 'Скасовано',
}

export const SYNC_SOURCE_LABELS: Record<SyncSource, string> = {
  webhook: 'Вебхук',
  manual: 'Кнопка',
  nightly: 'Нічний запуск',
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  'purchase.create': 'Створення закупівлі',
  'purchase.cancel': 'Скасування закупівлі',
  'allocation.create': 'Додавання вкладення',
  'allocation.return': 'Повернення на склад',
  'allocation.cancel': 'Скасування вкладення',
  'allocation.transfer': 'Перенесення вкладення',
  'inventory.adjust': 'Коригування залишку',
  'product.create': 'Створення товару',
  'product.update': 'Зміна товару',
  'supplier.create': 'Створення постачальника',
  'supplier.update': 'Зміна постачальника',
  'category.create': 'Створення категорії',
  'category.update': 'Зміна категорії',
  'user.create': 'Створення користувача',
  'user.update': 'Зміна користувача',
  'integration.sync': 'Синхронізація з RO App',
}

/**
 * Статус заявки за рядком з RO App.
 * Невідоме значення не ламає систему: повертаємо null, а в UI показуємо як є.
 */
export function orderStatusCode(db: Db, rawStatus: string): OrderStatusCode | null {
  const mapping = db.statusMappings.find((item) => item.raw === rawStatus)
  return mapping ? mapping.local : null
}

export function orderStatusLabel(db: Db, rawStatus: string): string {
  const mapping = db.statusMappings.find((item) => item.raw === rawStatus)
  if (mapping) return mapping.label
  return rawStatus
}

/** Заявка вважається закритою для правок у статусах «Готово» і «Закрито». */
export function isOrderLocked(db: Db, rawStatus: string): boolean {
  const code = orderStatusCode(db, rawStatus)
  return code === 'done' || code === 'closed'
}

export function orderTypeName(db: Db, typeId: string): string {
  const type = db.orderTypes.find((item) => item.id === typeId)
  return type ? type.name : '—'
}
