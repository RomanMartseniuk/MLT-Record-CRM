/**
 * Storage of the simulated server.
 *
 * Holds the whole mock database (`Db`) as a module-level singleton and
 * persists it to `localStorage`. This is the ONLY place that knows how the
 * mock data is kept; a real server replaces all of it with a PostgreSQL
 * database.
 *
 * Why a singleton: every handler reads and writes the same state, and the
 * state must survive a page reload.
 *
 * Data model rule: a committed `Db` object is never mutated in place. A
 * write clones it, changes the clone and commits the clone as the new
 * snapshot, so a read never sees a half-done write.
 */

import type { ApiResult } from '../contract/result'
import type { Db } from './engine/types'
import { createSeededDb } from './seed'

const DB_KEY = 'mlt-oblik:db:v1'
const USER_KEY = 'mlt-oblik:user:v1'

/* ─── Loading ──────────────────────────────────────────────────────── */

/** Reads the database from localStorage; falls back to demo data on any problem. */
function loadDb(): Db {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) return createSeededDb()
    const parsed = JSON.parse(raw) as Db
    // A cheap structural check: protects against empty or outdated storage.
    if (!parsed.orders || !parsed.products || !parsed.batches || !parsed.counters) {
      return createSeededDb()
    }
    return parsed
  } catch {
    // Storage is blocked or the JSON is corrupt: start from demo data.
    return createSeededDb()
  }
}

function loadSessionUserId(): string | null {
  try {
    return localStorage.getItem(USER_KEY)
  } catch {
    return null
  }
}

/* ─── State ────────────────────────────────────────────────────────── */

let db: Db = loadDb()
let sessionUserId: string | null = loadSessionUserId()
/** Writes the database to localStorage. Quota errors are ignored on purpose. */
function persistDb(): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    // Storage quota exceeded: the prototype keeps working in memory.
  }
}

/** Replaces the current snapshot and saves it. */
function commit(next: Db): void {
  db = next
  persistDb()
}

/* ─── Public API of the storage ────────────────────────────────────── */

/** The current database snapshot. Treat it as read-only. */
export function getDb(): Db {
  return db
}

/**
 * Runs a business operation on a copy of the database.
 * The copy is committed only if the operation succeeds (`ok: true`), so a
 * failed operation never leaves half-done changes behind.
 */
export function runOp<T>(fn: (draft: Db) => ApiResult<T>): ApiResult<T> {
  const draft = structuredClone(db)
  const result = fn(draft)
  if (result.ok) commit(draft)
  return result
}

/** An unchecked change (settings and similar). Always committed. */
export function mutateDb(fn: (draft: Db) => void): void {
  const draft = structuredClone(db)
  fn(draft)
  commit(draft)
}

/** Replaces the database with fresh demo data. */
export function resetDb(): void {
  commit(createSeededDb())
}

/* ─── Session ──────────────────────────────────────────────────────── */

/** Id of the signed-in user, or null. */
export function getSessionUserId(): string | null {
  return sessionUserId
}

/** Signs a user in (or out, with null) and persists the choice. */
export function setSessionUserId(id: string | null): void {
  sessionUserId = id
  try {
    if (id) localStorage.setItem(USER_KEY, id)
    else localStorage.removeItem(USER_KEY)
  } catch {
    // Storage is blocked: the session lives only until the page is reloaded.
  }
}
