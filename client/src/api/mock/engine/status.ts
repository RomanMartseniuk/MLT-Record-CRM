/**
 * Статуси заявок.
 *
 * Статус заявки приходить із RO App сирим рядком (`rawStatus`). Довідник
 * `db.statusMappings` перетворює його на локальне значення. Система
 * статуси НЕ змінює: це робить лише RO App.
 */

import type { OrderStatusCode } from '@/api/contract/types'
import type { Db } from './types'

/**
 * Локальний код статусу за сирим рядком з RO App.
 * Невідоме значення не ламає систему: повертаємо `null`, а інтерфейс
 * показує рядок як є.
 */
export function orderStatusCode(db: Db, rawStatus: string): OrderStatusCode | null {
  const mapping = db.statusMappings.find((item) => item.raw === rawStatus)
  return mapping ? mapping.local : null
}

/** Підпис статусу для людини; невідомий статус показується сирим рядком. */
export function orderStatusLabel(db: Db, rawStatus: string): string {
  const mapping = db.statusMappings.find((item) => item.raw === rawStatus)
  if (mapping) return mapping.label
  return rawStatus
}

/**
 * Чи заблоковані вкладення заявки для звичайних правок.
 *
 * Заявка закрита ТІЛЬКИ у статусі «Видано» (локальне `closed`). Статус
 * «Готово» її не блокує: між готовністю й видачею ще можуть знайти
 * недообліковану деталь. Правити закриту заявку може лише користувач із
 * правом `allocations.edit_closed` і з обов'язковою причиною.
 * Заявка з невідомим статусом не вважається закритою.
 */
export function isOrderLocked(db: Db, rawStatus: string): boolean {
  return orderStatusCode(db, rawStatus) === 'closed'
}
