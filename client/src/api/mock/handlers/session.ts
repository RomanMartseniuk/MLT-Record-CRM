/**
 * Who is acting.
 *
 * A real server reads the acting user from the JWT of every request. The mock
 * keeps the signed-in user id in the storage; handlers that write data ask
 * this module for it.
 */

import type { ApiResult } from '../../contract/result'
import type { Session } from '../../contract/dto'
import { permissionsOf } from '../engine/permissions'
import { fail, ok } from '../engine/result'
import type { Db } from '../engine/types'
import { getDb, getSessionUserId, runOp } from '../storage'

/** The session of the signed-in user, or null (nobody, or the user was blocked meanwhile). */
export function currentSession(): Session | null {
  const id = getSessionUserId()
  if (!id) return null
  const user = getDb().users.find((item) => item.id === id)
  if (!user || user.blocked) return null
  return { user, permissions: permissionsOf(user) }
}

/**
 * The id of the acting user, or a ready-made failure to return from a handler.
 * Usage: `const actor = actingUserId(); if (!actor.ok) return actor`.
 */
export function actingUserId(): ApiResult<string> {
  const session = currentSession()
  if (!session) return fail('Потрібно увійти в систему.')
  return ok(session.user.id)
}

/**
 * Runs a write operation of the engine as the signed-in user.
 * Fails with "sign in first" when there is no session; otherwise the
 * operation runs on a copy of the database that is saved only on success.
 */
export function runAsActor<T>(operation: (draft: Db, userId: string) => ApiResult<T>): ApiResult<T> {
  const actor = actingUserId()
  if (!actor.ok) return actor
  return runOp((draft) => operation(draft, actor.value))
}
