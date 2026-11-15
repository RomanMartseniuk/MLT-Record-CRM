/**
 * The demo database.
 *
 * `createSeededDb()` builds a complete, realistic database: users, clients,
 * equipment, orders, a catalog, and a history of purchases and allocations
 * replayed with the real engine operations (see `scenario.ts`). The data is
 * split by entity into the sibling files.
 *
 * It is used when the browser storage is empty or corrupt, and by the
 * "reset demo data" button.
 */

import { pushAudit } from '../engine/audit'
import type { Db } from '../engine/types'
import { CATEGORIES, SUPPLIERS, buildProducts } from './catalog'
import { applyFinalStatuses, buildOrders } from './orders'
import { ASSETS, CLIENTS, USERS } from './people'
import { ORDER_TYPES, STATUS_MAPPINGS } from './reference'
import { runScenario, seedSyncLog } from './scenario'
import { daysAgo } from './time'

/** The database before any history: reference data and open orders, no purchases yet. */
function createBaseDb(): Db {
  return {
    users: USERS.map((user) => ({ ...user })),
    orderTypes: ORDER_TYPES.map((type) => ({ ...type })),
    statusMappings: STATUS_MAPPINGS.map((mapping) => ({ ...mapping })),
    clients: CLIENTS.map((client) => ({ ...client })),
    assets: ASSETS.map((asset) => ({ ...asset })),
    orders: buildOrders(),
    categories: CATEGORIES.map((category) => ({ ...category })),
    products: buildProducts(),
    suppliers: SUPPLIERS.map((supplier) => ({ ...supplier })),
    purchases: [],
    batches: [],
    allocations: [],
    audit: [],
    syncLog: [],
    settings: {
      orgName: 'MLT Service',
      currency: 'UAH',
      timeZone: 'Europe/Kyiv',
      dateFormat: 'ДД.ММ.РРРР',
      nightlySyncTime: '03:00',
      webhookUrl: 'https://oblik.mlt.service/api/roapp/webhook',
      webhookEnabled: true,
    },
    lastSyncAt: daysAgo(0, 3, 0),
    counters: { purchase: 0 },
  }
}

/** A fully populated database. */
export function createSeededDb(): Db {
  const db = createBaseDb()

  runScenario(db)
  applyFinalStatuses(db)
  seedSyncLog(db)

  pushAudit(
    db,
    {
      userId: 'u_admin',
      action: 'integration.sync',
      objectType: 'RO App',
      objectId: 'integration',
      objectLabel: 'Первинне завантаження',
      after: `завантажено ${db.orders.length} заявок, ${db.clients.length} клієнтів, ${db.assets.length} од. техніки`,
    },
    daysAgo(73, 8, 0),
  )

  // The journal is listed newest first.
  db.audit.sort((a, b) => (a.at < b.at ? 1 : -1))

  return db
}
