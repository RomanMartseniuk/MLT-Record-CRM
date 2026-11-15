/**
 * Constants shared by the UI and the server.
 */

import type { Permission, UserRole } from './types'

/** Value of an analytics filter that means "no filter on this field". */
export const EMPTY_FILTER = 'all'

/** Every permission of the system. */
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

/**
 * The base permission set of each role. Manager-like rights are not a role:
 * an administrator grants them to each user individually (`extraPermissions`).
 * The UI shows this table in the permissions dialog; the server enforces it.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: ALL_PERMISSIONS,
  executor: ['purchases.view', 'purchases.create', 'allocations.create'],
}
