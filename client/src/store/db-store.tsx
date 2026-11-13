import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createSeededDb } from '@/mocks/seed'
import { can } from '@/domain/permissions'
import type { OpResult } from '@/domain/ops'
import type { Db, Permission, User } from '@/domain/types'

const DB_KEY = 'mlt-oblik:db:v1'
const USER_KEY = 'mlt-oblik:user:v1'

function loadDb(): Db {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) return createSeededDb()
    const parsed = JSON.parse(raw) as Db
    if (!parsed.orders || !parsed.products || !parsed.batches || !parsed.counters) {
      return createSeededDb()
    }
    return parsed
  } catch {
    return createSeededDb()
  }
}

function loadUserId(): string | null {
  try {
    return localStorage.getItem(USER_KEY)
  } catch {
    return null
  }
}

export interface DbContextValue {
  db: Db
  /** Виконує операцію на копії бази. Помилка нічого не змінює. */
  apply: <T>(fn: (draft: Db) => OpResult<T>) => OpResult<T>
  /** Проста зміна без перевірок (налаштування, фільтри тощо). */
  mutate: (fn: (draft: Db) => void) => void
  reset: () => void
  currentUser: User | null
  login: (userId: string) => void
  logout: () => void
  has: (permission: Permission) => boolean
}

const DbContext = createContext<DbContextValue | null>(null)

export function DbProvider({ children }: { children: ReactNode }) {
  const [db, setDbState] = useState<Db>(() => loadDb())
  const [userId, setUserId] = useState<string | null>(() => loadUserId())
  const dbRef = useRef(db)

  useEffect(() => {
    dbRef.current = db
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db))
    } catch {
      // Перевищено квоту сховища — прототип продовжує працювати в пам'яті.
    }
  }, [db])

  useEffect(() => {
    try {
      if (userId) localStorage.setItem(USER_KEY, userId)
      else localStorage.removeItem(USER_KEY)
    } catch {
      // ignore
    }
  }, [userId])

  const apply = useCallback(<T,>(fn: (draft: Db) => OpResult<T>): OpResult<T> => {
    const draft = structuredClone(dbRef.current)
    const result = fn(draft)
    if (result.ok) {
      dbRef.current = draft
      setDbState(draft)
    }
    return result
  }, [])

  const mutate = useCallback((fn: (draft: Db) => void) => {
    const draft = structuredClone(dbRef.current)
    fn(draft)
    dbRef.current = draft
    setDbState(draft)
  }, [])

  const reset = useCallback(() => {
    const fresh = createSeededDb()
    dbRef.current = fresh
    setDbState(fresh)
  }, [])

  const currentUser = useMemo(() => {
    if (!userId) return null
    return db.users.find((user) => user.id === userId) ?? null
  }, [db.users, userId])

  const has = useCallback(
    (permission: Permission) => can(currentUser, permission),
    [currentUser],
  )

  const value = useMemo<DbContextValue>(
    () => ({
      db,
      apply,
      mutate,
      reset,
      currentUser,
      login: setUserId,
      logout: () => setUserId(null),
      has,
    }),
    [db, apply, mutate, reset, currentUser, has],
  )

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>
}

export function useDb(): DbContextValue {
  const context = useContext(DbContext)
  if (!context) throw new Error('useDb має використовуватись у середині DbProvider')
  return context
}
