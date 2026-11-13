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

/** Гроші зберігаються в копійках (ціле число), щоб не втрачати точність. */
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

/** Парсить введену користувачем суму в копійки. Приймає і кому, і точку. */
export function parseMoneyToKop(input: string): number | null {
  const normalized = input.replace(/\s/g, '').replace(',', '.')
  if (normalized === '') return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

/** Копійки у значення для текстового поля: 125000 -> "1250.00" */
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
