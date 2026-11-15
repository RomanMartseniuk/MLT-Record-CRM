/**
 * Mock handler of the `integration` module (RO App synchronisation).
 *
 * SIMULATION: on a real server this is the RO App client with one
 * synchronisation function used by the webhook, the button and the nightly
 * run (see docs/03-backend-plan.md, step 9). Nothing is ever written back to
 * RO App.
 */

import type { IntegrationApi } from '../../contract/client'
import { syncRoApp } from '../engine/integration'
import { delay } from '../latency'
import { getDb } from '../storage'
import { runAsActor } from './session'

export const integrationApi: IntegrationApi = {
  async status() {
    await delay()
    const db = getDb()
    return {
      lastSyncAt: db.lastSyncAt,
      ordersCount: db.orders.length,
      clientsCount: db.clients.length,
      assetsCount: db.assets.length,
      log: db.syncLog,
      settings: {
        webhookUrl: db.settings.webhookUrl,
        webhookEnabled: db.settings.webhookEnabled,
        nightlySyncTime: db.settings.nightlySyncTime,
      },
    }
  },

  async sync(source) {
    await delay()
    return runAsActor((draft, userId) => syncRoApp(draft, source, userId))
  },
}
