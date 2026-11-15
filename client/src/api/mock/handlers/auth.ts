/**
 * Mock handler of the `auth` module.
 *
 * Signing in only stores the chosen user id in the storage. A real server
 * checks the password and returns a JWT instead.
 */

import type { AuthApi } from '../../contract/client'
import { delay } from '../latency'
import { fail, ok } from '../engine/result'
import { getDb, setSessionUserId } from '../storage'
import { currentSession } from './session'

export const authApi: AuthApi = {
  async me() {
    await delay()
    return currentSession()
  },

  async listDemoUsers() {
    await delay()
    return getDb().users.filter((user) => !user.blocked)
  },

  // The prototype accepts any password; only the e-mail is looked up.
  async login(email) {
    await delay()
    const found = getDb().users.find((user) => user.email.toLowerCase() === email.trim().toLowerCase())
    if (!found) return fail('Користувача з такою поштою немає. Скористайтесь швидким входом нижче.')
    if (found.blocked) return fail('Користувача заблоковано. Зверніться до адміністратора.')
    setSessionUserId(found.id)
    return ok(currentSession()!)
  },

  async loginAsDemo(userId) {
    await delay()
    const found = getDb().users.find((user) => user.id === userId)
    if (!found) return fail('Користувача не знайдено.')
    if (found.blocked) return fail('Користувача заблоковано. Зверніться до адміністратора.')
    setSessionUserId(found.id)
    return ok(currentSession()!)
  },

  async logout() {
    await delay()
    setSessionUserId(null)
  },
}
