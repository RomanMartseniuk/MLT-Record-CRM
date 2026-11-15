/**
 * DTOs of the API contract — shared building blocks and the session.
 *
 * Server responses arrive already computed (totals, statuses, display names),
 * so a page never calculates them itself. See ./index.ts for the full contract.
 */

import type {
  Permission,
  User,
} from '../types'

/** A closed interval of ISO dates, both ends inclusive. */
export interface DateRange {
  from: string
  to: string
}

/** A label with a number, the basic building block of charts. */
export interface NamedValue {
  name: string
  value: number
}

/** One point of a purchases-vs-allocations time series. */
export interface SeriesPoint {
  label: string
  purchases: number
  allocations: number
}

/* ─── Auth ─────────────────────────────────────────────────────────── */

/** The signed-in user together with the effective permission list. */
export interface Session {
  user: User
  permissions: Permission[]
}
