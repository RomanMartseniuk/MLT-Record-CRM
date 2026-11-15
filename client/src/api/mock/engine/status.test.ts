import { describe, expect, test } from 'vitest'
import { isOrderLocked, orderStatusCode, orderStatusLabel } from './status'
import { makeDb } from './test-utils'

const db = makeDb()

describe('isOrderLocked', () => {
  test('an issued order ("Видано") is locked', () => {
    expect(isOrderLocked(db, 'closed')).toBe(true)
  })

  test('"Готово" does not lock the order', () => {
    expect(isOrderLocked(db, 'ready')).toBe(false)
  })

  test('orders in the queue or in work are not locked', () => {
    expect(isOrderLocked(db, 'in-queue')).toBe(false)
    expect(isOrderLocked(db, 'in-progress')).toBe(false)
  })

  test('a status without a mapping neither locks nor throws', () => {
    expect(isOrderLocked(db, 'on-hold')).toBe(false)
  })
})

describe('order status lookup', () => {
  test('a mapped status resolves to its local code and label', () => {
    expect(orderStatusCode(db, 'ready')).toBe('done')
    expect(orderStatusLabel(db, 'closed')).toBe('Видано')
  })

  test('an unknown status has no code and shows as the raw string', () => {
    expect(orderStatusCode(db, 'on-hold')).toBeNull()
    expect(orderStatusLabel(db, 'on-hold')).toBe('on-hold')
  })
})
