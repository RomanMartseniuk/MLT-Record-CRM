/**
 * Ролі та права.
 *
 * Є дві ролі: адміністратор і виконавець. «Менеджер» окремою роллю не є:
 * адміністратор видає менеджерські права кожному користувачеві окремо
 * (`extraPermissions`). Перевірка прав на реальному сервері робиться на
 * кожному ендпоїнті; інтерфейс лише ховає недоступні кнопки.
 */

import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from '@/api/contract/constants'
import type { Permission, User } from '@/api/contract/types'

// Таблиці прав спільні для сервера й інтерфейсу, тому живуть у контракті.
export { ALL_PERMISSIONS, ROLE_PERMISSIONS }

/** Ефективні права користувача: права ролі плюс індивідуальні, без дублікатів. */
export function permissionsOf(user: User): Permission[] {
  const result = new Set<Permission>(ROLE_PERMISSIONS[user.role])
  for (const permission of user.extraPermissions) result.add(permission)
  return Array.from(result)
}

/** Чи має користувач право. Заблокований користувач і `null` не мають жодного. */
export function can(user: User | null, permission: Permission): boolean {
  if (!user || user.blocked) return false
  return permissionsOf(user).includes(permission)
}
