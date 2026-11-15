import { describe, expect, test } from 'vitest'
import { inRange, previousRange } from './dates'

const range = { from: '2026-03-01T00:00:00.000Z', to: '2026-03-31T23:59:59.999Z' }

describe('inRange', () => {
  test('includes both ends of the range', () => {
    expect(inRange(range.from, range)).toBe(true)
    expect(inRange(range.to, range)).toBe(true)
  })

  test('includes a moment inside the range', () => {
    expect(inRange('2026-03-15T12:00:00.000Z', range)).toBe(true)
  })

  test('excludes moments before and after the range', () => {
    expect(inRange('2026-02-28T23:59:59.999Z', range)).toBe(false)
    expect(inRange('2026-04-01T00:00:00.000Z', range)).toBe(false)
  })
})

describe('previousRange', () => {
  const march = { from: '2026-03-01T00:00:00.000Z', to: '2026-03-31T23:59:59.999Z' }
  const previous = previousRange(march)
  const ms = (iso: string) => new Date(iso).getTime()

  test('ends exactly one millisecond before the range starts, so the periods never overlap', () => {
    expect(ms(previous.to)).toBe(ms(march.from) - 1)
  })

  test('has the same length as the range, so the two periods can be compared fairly', () => {
    expect(ms(previous.to) - ms(previous.from)).toBe(ms(march.to) - ms(march.from))
  })
})
