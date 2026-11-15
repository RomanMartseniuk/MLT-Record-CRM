/**
 * Human-readable labels for the enums of the API contract.
 *
 * These are purely presentational (the Ukrainian wording the interface
 * shows), so they live in the UI layer and not in the server logic.
 */

import type {
  AllocationStatus,
  AuditAction,
  OrderStatusCode,
  Permission,
  PurchaseDestination,
  PurchaseStatus,
  SyncSource,
  UserRole,
} from '@/api'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Адміністратор',
  executor: 'Виконавець',
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  'purchases.view': 'Перегляд закупівель',
  'purchases.create': 'Створення закупівель',
  'allocations.create': 'Додавання вкладень',
  'allocations.edit_closed': 'Зміна вкладень у закритій заявці',
  'inventory.manage': 'Коригування складу',
  'reports.view': 'Перегляд аналітики та журналу',
  'reports.export': 'Експорт звітів',
  'users.manage': 'Керування користувачами',
  'settings.manage': 'Системні налаштування',
}

/** Local order statuses; "Видано" is the only one that locks allocations. */
export const ORDER_STATUS_LABELS: Record<OrderStatusCode, string> = {
  inQueue: 'В черзі',
  inWork: 'В роботі',
  done: 'Готово',
  closed: 'Видано',
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
  'inventory.adjust': 'Коригування',
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
