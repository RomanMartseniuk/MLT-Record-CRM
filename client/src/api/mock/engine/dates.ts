/**
 * Робота з датами на стороні «сервера».
 *
 * Усі дати в системі — рядки ISO 8601 у UTC, тому їх можна порівнювати
 * як звичайні рядки: лексикографічний порядок збігається з хронологічним.
 */

import type { DateRange } from '@/api/contract/dto'

/** Поточний момент як рядок ISO. */
export function now(): string {
  return new Date().toISOString()
}

/** Чи потрапляє момент у період (обидві межі включно). */
export function inRange(iso: string, range: DateRange): boolean {
  return iso >= range.from && iso <= range.to
}

/**
 * Попередній період тієї самої тривалості, що закінчується за мілісекунду до
 * початку цього. Потрібен для порівняння («+120 грн до попереднього періоду»):
 * періоди не перекриваються й однакові за довжиною.
 *
 * Межі періоду включно, тому початок попереднього — на `length + 1` мс раніше
 * (інакше він був би на мілісекунду коротшим за цей).
 */
export function previousRange(range: DateRange): DateRange {
  const from = new Date(range.from).getTime()
  const to = new Date(range.to).getTime()
  const length = to - from
  return {
    from: new Date(from - length - 1).toISOString(),
    to: new Date(from - 1).toISOString(),
  }
}

/** Довжина періоду в добах, щонайменше 1. */
export function rangeDays(range: DateRange): number {
  const ms = new Date(range.to).getTime() - new Date(range.from).getTime()
  return Math.max(1, Math.round(ms / 86_400_000))
}
