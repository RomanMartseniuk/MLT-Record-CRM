/**
 * Mock handler of the `audit` module: the operations journal.
 *
 * Journal entries are never changed or deleted. The list is returned newest
 * first, limited to the requested period.
 */

import type { AuditApi } from '../../contract/client'
import { inRange } from '../engine/dates'
import { sortBy } from '../engine/util'
import { delay } from '../latency'
import { getDb } from '../storage'

export const auditApi: AuditApi = {
  async list(filters) {
    await delay()
    const db = getDb()
    const entries = sortBy(
      db.audit.filter((entry) => inRange(entry.at, filters.range)),
      (entry) => entry.at,
    ).reverse()
    return entries.map((entry) => ({
      entry,
      userName: db.users.find((user) => user.id === entry.userId)?.fullName ?? 'Система',
    }))
  },
}
