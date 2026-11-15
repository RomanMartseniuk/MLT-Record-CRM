import { describe, expect, test } from 'vitest'
import { createUser, updateUser } from './users'
import { makeScenarioDb } from './test-utils'

const INPUT = {
  fullName: 'Іван Петренко',
  email: 'ivan@example.com',
  role: 'executor' as const,
  extraPermissions: [],
}

describe('createUser', () => {
  test('creates an active user and writes an audit entry', () => {
    const db = makeScenarioDb()

    const result = createUser(db, INPUT, 'u1')

    expect(result.ok).toBe(true)
    expect(db.users.at(-1)).toMatchObject({ email: 'ivan@example.com', blocked: false })
    expect(db.audit.map((entry) => entry.action)).toEqual(['user.create'])
  })

  test('rejects an empty name, a bad e-mail and a duplicate e-mail', () => {
    const db = makeScenarioDb()
    createUser(db, INPUT, 'u1')
    const before = structuredClone(db)

    expect(createUser(db, { ...INPUT, fullName: ' ' }, 'u1').ok).toBe(false)
    expect(createUser(db, { ...INPUT, email: 'not-an-email' }, 'u1')).toEqual({
      ok: false,
      error: 'Вкажіть коректну електронну пошту.',
    })
    expect(createUser(db, { ...INPUT, email: 'IVAN@example.com' }, 'u1')).toEqual({
      ok: false,
      error: 'Користувач з такою поштою вже існує.',
    })
    expect(db).toEqual(before)
  })
})

describe('updateUser', () => {
  test('changes role, extra permissions and the blocked flag', () => {
    const db = makeScenarioDb()

    const result = updateUser(
      db,
      'u1',
      { role: 'admin', extraPermissions: ['reports.view'], blocked: true },
      'u1',
    )

    expect(result.ok).toBe(true)
    expect(db.users[0]).toMatchObject({
      role: 'admin',
      extraPermissions: ['reports.view'],
      blocked: true,
    })
    expect(db.audit.map((entry) => entry.action)).toEqual(['user.update'])
  })

  test('refuses an unknown user', () => {
    expect(updateUser(makeScenarioDb(), 'nope', { blocked: true }, 'u1')).toEqual({
      ok: false,
      error: 'Користувача не знайдено.',
    })
  })
})
