/**
 * Дрібні допоміжні функції рушія.
 *
 * Навмисно не імпортуються з `@/lib/utils`: ця логіка переїде на сервер,
 * а `lib/utils` належить інтерфейсу (там, наприклад, `cn` для Tailwind).
 */

/** Короткий випадковий ідентифікатор сутності з префіксом (`pur_k3j9x2ab`). */
export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

/** Нова відсортована копія масиву за ключем (оригінал не змінюється). */
export function sortBy<T>(items: T[], key: (item: T) => number | string): T[] {
  return [...items].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    if (ka < kb) return -1
    if (ka > kb) return 1
    return 0
  })
}

/** Сума чисел. Для порожнього масиву — 0. */
export function sum(values: number[]): number {
  let total = 0
  for (const value of values) total += value
  return total
}
