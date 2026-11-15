import { describe, expect, test } from 'vitest'
import { ALL_PERMISSIONS, can, permissionsOf } from './permissions'
import { makeUser } from './test-utils'

describe('permissionsOf', () => {
  test('an administrator has every permission', () => {
    const admin = makeUser({ role: 'admin' })

    expect([...permissionsOf(admin)].sort()).toEqual([...ALL_PERMISSIONS].sort())
  })

  test('an executor gets only the base working permissions', () => {
    const executor = makeUser({ role: 'executor' })

    expect([...permissionsOf(executor)].sort()).toEqual(
      ['allocations.create', 'purchases.create', 'purchases.view'].sort(),
    )
  })

  test('individual permissions are added on top of the role without duplicates', () => {
    const manager = makeUser({
      role: 'executor',
      extraPermissions: ['reports.view', 'purchases.view'],
    })

    const permissions = permissionsOf(manager)

    expect(permissions).toContain('reports.view')
    expect(permissions.filter((permission) => permission === 'purchases.view')).toHaveLength(1)
  })
})

describe('can', () => {
  test('allows a permission the user has', () => {
    expect(can(makeUser({ role: 'executor' }), 'allocations.create')).toBe(true)
  })

  test('denies a permission the user lacks', () => {
    expect(can(makeUser({ role: 'executor' }), 'allocations.edit_closed')).toBe(false)
  })

  test('denies everything to nobody and to a blocked user, even an administrator', () => {
    expect(can(null, 'purchases.view')).toBe(false)
    expect(can(makeUser({ role: 'admin', blocked: true }), 'purchases.view')).toBe(false)
  })
})
