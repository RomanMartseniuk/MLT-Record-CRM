/**
 * Форматування для текстів журналу та повідомлень про помилки.
 *
 * Рушій сам складає людські рядки («3 шт, 54,00 ₴»), які потрапляють у
 * журнал операцій, тому потребує власного мінімального форматера.
 * Вигляд збігається з тим, що показує інтерфейс (`lib/format`).
 */

const moneyFormatter = new Intl.NumberFormat('uk-UA', {
  style: 'currency',
  currency: 'UAH',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const qtyFormatter = new Intl.NumberFormat('uk-UA', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
})

/** Гроші зберігаються цілими копійками, щоб не втрачати точність. */
export function formatMoney(kop: number): string {
  return moneyFormatter.format(kop / 100)
}

/** Кількість з одиницею виміру (`2,5 л`), якщо вона задана. */
export function formatQty(qty: number, unit?: string): string {
  const value = qtyFormatter.format(qty)
  return unit ? `${value} ${unit}` : value
}
