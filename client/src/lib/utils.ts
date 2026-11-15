/**
 * Small general helpers of the UI layer.
 *
 * The business logic has its own copies of what it needs in
 * `api/mock/engine/util.ts`, so it can move to the server without this file.
 */

import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Joins class names and resolves conflicting Tailwind classes (the last one wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** A short random identifier with a prefix, for ids created in the UI (e.g. product links). */
export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

/** A new array sorted by a key (the original is not changed). */
export function sortBy<T>(items: T[], key: (item: T) => number | string): T[] {
  return [...items].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    if (ka < kb) return -1
    if (ka > kb) return 1
    return 0
  })
}
