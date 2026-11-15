/**
 * Допоміжні конструктори результату операції.
 *
 * Операція рушія ніколи не кидає виняток через порушення бізнес-правила:
 * вона повертає `{ ok: false, error }` з текстом, готовим для показу
 * користувачеві (українською). Успіх — `{ ok: true, value }`.
 */

import type { ApiResult } from '@/api/contract/result'

/** Невдалий результат із повідомленням для користувача. */
export function fail(error: string): ApiResult<never> {
  return { ok: false, error }
}

/** Успішний результат зі значенням. */
export function ok<T>(value: T): ApiResult<T> {
  return { ok: true, value }
}
