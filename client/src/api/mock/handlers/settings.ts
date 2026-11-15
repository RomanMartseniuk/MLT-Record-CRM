/**
 * Mock handler of the `settings` module (organisation and integration
 * parameters). Settings changes are plain edits, not accounting operations,
 * so they do not go to the audit log.
 */

import type { SettingsApi } from '../../contract/client'
import { delay } from '../latency'
import { getDb, mutateDb, resetDb } from '../storage'

export const settingsApi: SettingsApi = {
  async get() {
    await delay()
    return getDb().settings
  },

  async update(patch) {
    await delay()
    mutateDb((draft) => {
      draft.settings = { ...draft.settings, ...patch }
    })
    return getDb().settings
  },

  // Demo only: there is no such thing on a real server.
  async resetDemoData() {
    await delay()
    resetDb()
  },
}
