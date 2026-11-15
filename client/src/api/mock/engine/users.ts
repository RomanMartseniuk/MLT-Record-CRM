/**
 * Користувачі.
 *
 * Користувачів створює лише адміністратор, самостійної реєстрації немає.
 * Користувача не видаляють, а блокують (`blocked`): заблокований
 * користувач не має жодного права (див. `permissions.ts`).
 */

import type { UserInput, UserPatch } from '@/api/contract/dto'
import type { ApiResult } from '@/api/contract/result'
import type { User } from '@/api/contract/types'
import { pushAudit } from './audit'
import { fail, ok } from './result'
import type { Db } from './types'
import { uid } from './util'

/** Створює користувача: імʼя обов'язкове, пошта коректна й унікальна. */
export function createUser(db: Db, input: UserInput, userId: string): ApiResult<User> {
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

  return ok(user)
}

/** Змінює роль, індивідуальні права або блокування користувача. */
export function updateUser(db: Db, targetId: string, patch: UserPatch, userId: string): ApiResult {
  const user = db.users.find((item) => item.id === targetId)
  if (!user) return fail('Користувача не знайдено.')

  const describe = () =>
    `${user.role}, ${user.extraPermissions.length} дод. прав, ${user.blocked ? 'заблокований' : 'активний'}`

  const before = describe()
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
    after: describe(),
  })

  return ok(undefined)
}
