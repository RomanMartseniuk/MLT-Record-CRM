/**
 * Mock handler of the `users` module.
 *
 * Users are never deleted, only blocked. Every change is an accounting
 * operation with an audit entry (done by the engine).
 */

import type { UsersApi } from '../../contract/client'
import { createUser, updateUser } from '../engine/users'
import { delay } from '../latency'
import { getDb } from '../storage'
import { runAsActor } from './session'

export const usersApi: UsersApi = {
  async list() {
    await delay()
    return getDb().users
  },

  async create(input) {
    await delay()
    return runAsActor((draft, userId) => createUser(draft, input, userId))
  },

  async update(id, patch) {
    await delay()
    return runAsActor((draft, userId) => updateUser(draft, id, patch, userId))
  },
}
