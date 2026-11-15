/**
 * DTOs of the API contract — ro app integration and reference lists.
 *
 * Server responses arrive already computed (totals, statuses, display names),
 * so a page never calculates them itself. See ./index.ts for the full contract.
 */

import type {
  OrderType,
  Settings,
  StatusMapping,
  SyncLogEntry,
} from '../types'

export interface SyncResult {
  added: number
  updated: number
}

export interface IntegrationStatus {
  lastSyncAt: string | null
  /** What has been loaded from RO App so far. */
  ordersCount: number
  clientsCount: number
  assetsCount: number
  /** Synchronisation log, newest first. */
  log: SyncLogEntry[]
  settings: Pick<Settings, 'webhookUrl' | 'webhookEnabled' | 'nightlySyncTime'>
}

/** Reference lists that pages need for filters and labels. */
export interface Reference {
  orderTypes: OrderType[]
  statusMappings: StatusMapping[]
  assetTypes: string[]
  /** Statuses that RO App sent but we have no mapping for yet. */
  unmappedStatuses: string[]
  /** id + name pairs for filter dropdowns (anyone who may see reports can use them). */
  employees: IdName[]
  categories: IdName[]
  suppliers: IdName[]
}

/** A reference entry shown in a dropdown. */
export interface IdName {
  id: string
  name: string
}
