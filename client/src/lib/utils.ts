import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Короткий випадковий ідентифікатор для мокових сутностей. */
export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function sortBy<T>(items: T[], key: (item: T) => number | string): T[] {
  return [...items].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    if (ka < kb) return -1
    if (ka > kb) return 1
    return 0
  })
}

export function sum(values: number[]): number {
  let total = 0
  for (const value of values) total += value
  return total
}

export function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of items) {
    const k = key(item)
    if (!result[k]) result[k] = []
    result[k].push(item)
  }
  return result
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}
