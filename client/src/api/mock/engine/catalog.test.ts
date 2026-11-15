import { describe, expect, test } from 'vitest'
import {
  createCategory,
  createProduct,
  createSupplier,
  updateCategory,
  updateProduct,
  updateSupplier,
} from './catalog'
import { makeScenarioDb } from './test-utils'

const PRODUCT = { name: 'Свічка', categoryId: 'c1', unit: 'шт' as const, links: [] }

describe('products', () => {
  test('createProduct stores an active product and writes an audit entry', () => {
    const db = makeScenarioDb()

    const result = createProduct(db, { ...PRODUCT, name: '  Свічка ' }, 'u1')

    expect(result.ok).toBe(true)
    const created = db.products.at(-1)!
    expect(created).toMatchObject({ name: 'Свічка', categoryId: 'c1', active: true })
    expect(db.audit.map((entry) => entry.action)).toEqual(['product.create'])
  })

  test('createProduct rejects an empty name, no category and a duplicate name', () => {
    const db = makeScenarioDb()
    const before = structuredClone(db)

    expect(createProduct(db, { ...PRODUCT, name: ' ' }, 'u1')).toEqual({
      ok: false,
      error: 'Вкажіть назву товару.',
    })
    expect(createProduct(db, { ...PRODUCT, categoryId: '' }, 'u1')).toEqual({
      ok: false,
      error: 'Виберіть категорію.',
    })
    expect(createProduct(db, { ...PRODUCT, name: 'PRODUCT' }, 'u1')).toEqual({
      ok: false,
      error: 'Товар з такою назвою вже є на складі.',
    })
    expect(db).toEqual(before)
  })

  test('updateProduct changes the fields, and refuses an unknown product or an empty name', () => {
    const db = makeScenarioDb()

    expect(updateProduct(db, 'p1', { name: 'Нова назва', unit: 'л' }, 'u1').ok).toBe(true)
    expect(db.products[0]).toMatchObject({ name: 'Нова назва', unit: 'л' })
    expect(updateProduct(db, 'nope', { name: 'X' }, 'u1')).toEqual({
      ok: false,
      error: 'Товар не знайдено.',
    })
    expect(updateProduct(db, 'p1', { name: '  ' }, 'u1')).toEqual({
      ok: false,
      error: 'Назва не може бути порожньою.',
    })
  })
})

describe('suppliers', () => {
  test('createSupplier needs a name and creates an active supplier', () => {
    const db = makeScenarioDb()

    expect(createSupplier(db, { name: ' ' }, 'u1')).toEqual({
      ok: false,
      error: 'Вкажіть назву постачальника.',
    })
    expect(createSupplier(db, { name: 'Нова Пошта' }, 'u1').ok).toBe(true)
    expect(db.suppliers.at(-1)).toMatchObject({ name: 'Нова Пошта', active: true })
  })

  test('updateSupplier can deactivate a supplier and leaves an audit trail of the change', () => {
    const db = makeScenarioDb()

    expect(updateSupplier(db, 's1', { active: false }, 'u1').ok).toBe(true)

    expect(db.suppliers[0].active).toBe(false)
    expect(db.audit[0]).toMatchObject({
      action: 'supplier.update',
      before: 'активний',
      after: 'неактивний',
    })
    expect(updateSupplier(db, 'nope', { active: true }, 'u1').ok).toBe(false)
  })
})

describe('categories', () => {
  test('createCategory needs a name', () => {
    const db = makeScenarioDb()

    expect(createCategory(db, { name: ' ', kind: 'product', parentId: null }, 'u1')).toEqual({
      ok: false,
      error: 'Вкажіть назву категорії.',
    })
    expect(createCategory(db, { name: 'Мастила', kind: 'product', parentId: null }, 'u1').ok).toBe(true)
    expect(db.categories.at(-1)).toMatchObject({ name: 'Мастила', active: true })
  })

  test('updateCategory deactivates it and refuses an unknown one', () => {
    const db = makeScenarioDb()

    expect(updateCategory(db, 'c1', { active: false }, 'u1').ok).toBe(true)
    expect(db.categories[0].active).toBe(false)
    expect(updateCategory(db, 'nope', { active: true }, 'u1')).toEqual({
      ok: false,
      error: 'Категорію не знайдено.',
    })
  })
})
