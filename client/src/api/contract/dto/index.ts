/**
 * All request inputs and response view models (DTOs) of the API contract.
 *
 * The rule behind every DTO: the server returns values already computed
 * (totals, statuses, names, "is locked" flags), so a page never needs the raw
 * database or the business engine to render a row. When a page needs one more
 * computed value, add it to the matching file here instead of calculating it
 * in the UI.
 */

export type * from './common'
export type * from './accounts'
export type * from './warehouse'
export type * from './purchases'
export type * from './orders'
export type * from './reports'
export type * from './integration'
