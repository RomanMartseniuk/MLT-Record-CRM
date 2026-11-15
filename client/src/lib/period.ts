/**
 * Period selection for the UI.
 *
 * The user picks a period ("week", "month", a custom range…); this module
 * turns the choice into a `DateRange` that is sent to the API as a filter.
 * Computing the range is a UI concern (it depends on the user's local
 * calendar), so it lives here and not in the server.
 */

import type { DateRange } from '@/api'

export type PeriodKey = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom'

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: 'Сьогодні',
  week: 'Тиждень',
  month: 'Місяць',
  year: 'Рік',
  all: 'Весь час',
  custom: 'Власний період',
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function endOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

/**
 * Converts a period choice into an ISO date range ending at the end of today.
 * "week" is the last 7 days, "month" the last 30, "year" starts at the first
 * day of the month 11 months ago, "all" starts in 2000, "custom" uses `custom`.
 */
export function rangeFor(period: PeriodKey, custom?: DateRange): DateRange {
  const now = new Date()
  const to = endOfDay(now).toISOString()

  if (period === 'custom' && custom) {
    return {
      from: startOfDay(new Date(custom.from)).toISOString(),
      to: endOfDay(new Date(custom.to)).toISOString(),
    }
  }

  if (period === 'today') return { from: startOfDay(now).toISOString(), to }

  if (period === 'week') {
    const from = startOfDay(now)
    from.setDate(from.getDate() - 6)
    return { from: from.toISOString(), to }
  }

  if (period === 'month') {
    const from = startOfDay(now)
    from.setDate(from.getDate() - 29)
    return { from: from.toISOString(), to }
  }

  if (period === 'year') {
    const from = startOfDay(now)
    from.setMonth(from.getMonth() - 11)
    from.setDate(1)
    return { from: from.toISOString(), to }
  }

  return { from: new Date(2000, 0, 1).toISOString(), to }
}
