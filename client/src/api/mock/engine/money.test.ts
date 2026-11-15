import { describe, expect, test } from 'vitest'
import { roundQty } from './money'

describe('roundQty', () => {
  test('removes floating point noise from a sum of fractions', () => {
    expect(roundQty(0.1 + 0.2)).toBe(0.3)
  })

  test('keeps at most three decimal places', () => {
    expect(roundQty(1.23456)).toBe(1.235)
  })

  test('leaves whole numbers unchanged', () => {
    expect(roundQty(7)).toBe(7)
  })
})
