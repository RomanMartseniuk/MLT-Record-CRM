import type { Permission, User, UserRole } from './types'

export const ALL_PERMISSIONS: Permission[] = [
  'purchases.view',
  'purchases.create',
  'allocations.create',
  'allocations.edit_closed',
  'inventory.manage',
  'reports.view',
  'reports.export',
  'users.manage',
  'settings.manage',
]

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

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Адміністратор',
  executor: 'Виконавець',
}

/** Базовий набір прав роли. Менеджерські права видаються індивідуально. */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ALL_PERMISSIONS,
  executor: ['purchases.view', 'purchases.create', 'allocations.create'],
}

export function permissionsOf(user: User): Permission[] {
  const base = ROLE_PERMISSIONS[user.role]
  const result = new Set<Permission>(base)
  for (const permission of user.extraPermissions) result.add(permission)
  return Array.from(result)
}

export function can(user: User | null, permission: Permission): boolean {
  if (!user || user.blocked) return false
  return permissionsOf(user).includes(permission)
}
