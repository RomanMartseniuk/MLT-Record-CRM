import { describe, expect, test } from 'vitest'
import { assertInvariants } from '../engine/assert-invariants'
import { isOrderLocked, orderStatusCode } from '../engine/status'
import { createSeededDb } from './index'

const db = createSeededDb()

describe('createSeededDb', () => {
  test('builds the documented demo data set', () => {
    expect(db.orders).toHaveLength(16)
    expect(db.products).toHaveLength(18)
    expect(db.purchases).toHaveLength(11)
    expect(db.allocations).toHaveLength(29)
    expect(db.users.map((user) => user.id)).toEqual(['u_admin', 'u_master', 'u_manager', 'u_master2'])
  })

  test('passes the accounting invariants', () => {
    assertInvariants(db)
  })

  test('contains an issued order, a "ready" order and an order with an unmapped status', () => {
    const issued = db.orders.find((order) => order.rawStatus === 'closed')!
    const ready = db.orders.find((order) => order.rawStatus === 'ready')!
    const unmapped = db.orders.find((order) => order.rawStatus === 'on-hold')!

    expect(isOrderLocked(db, issued.rawStatus)).toBe(true)
    expect(isOrderLocked(db, ready.rawStatus)).toBe(false)
    expect(orderStatusCode(db, unmapped.rawStatus)).toBeNull()
  })

  test('contains a cancelled purchase and a purchase made straight into an order', () => {
    expect(db.purchases.some((purchase) => purchase.cancelled)).toBe(true)
    expect(db.purchases.some((purchase) => purchase.destination === 'order')).toBe(true)
  })

  test('has an inactive supplier and a synchronisation log with one failed run, newest first', () => {
    expect(db.suppliers.some((supplier) => !supplier.active)).toBe(true)
    expect(db.syncLog.some((entry) => !entry.ok)).toBe(true)
    const times = db.syncLog.map((entry) => entry.at)
    expect([...times].sort().reverse()).toEqual(times)
  })

  test('sorts the journal newest first', () => {
    const times = db.audit.map((entry) => entry.at)
    expect([...times].sort().reverse()).toEqual(times)
  })
})
