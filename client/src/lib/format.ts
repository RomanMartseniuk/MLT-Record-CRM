/**
 * Formatting and parsing of money, quantities and dates for the Ukrainian UI.
 * Money is always an integer number of kopecks (fields named *Kop).
 */

const moneyFormatter = new Intl.NumberFormat('uk-UA', {
  style: 'currency',
  currency: 'UAH',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const moneyCompactFormatter = new Intl.NumberFormat('uk-UA', {
  style: 'currency',
  currency: 'UAH',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const qtyFormatter = new Intl.NumberFormat('uk-UA', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
})

const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const monthFormatter = new Intl.DateTimeFormat('uk-UA', { month: 'short', year: '2-digit' })
const dayMonthFormatter = new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit' })

/** Money is stored in kopecks (an integer) so no precision is lost. */
export function formatMoney(kop: number): string {
  return moneyFormatter.format(kop / 100)
}

export function formatMoneyCompact(kop: number): string {
  return moneyCompactFormatter.format(kop / 100)
}

export function formatQty(qty: number, unit?: string): string {
  const value = qtyFormatter.format(qty)
  return unit ? `${value} ${unit}` : value
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso))
}

export function formatDayMonth(iso: string): string {
  return dayMonthFormatter.format(new Date(iso))
}

export function formatMonth(iso: string): string {
  return monthFormatter.format(new Date(iso))
}

/** Parses a sum typed by the user into kopecks. Accepts both a comma and a dot. */
export function parseMoneyToKop(input: string): number | null {
  const normalized = input.replace(/\s/g, '').replace(',', '.')
  if (normalized === '') return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

/** Kopecks as a text field value: 125000 -> "1250.00" */
export function kopToInput(kop: number): string {
  return (kop / 100).toFixed(2)
}

export function parseQty(input: string): number | null {
  const normalized = input.replace(/\s/g, '').replace(',', '.')
  if (normalized === '') return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 1000) / 1000
}

export function pluralUa(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
