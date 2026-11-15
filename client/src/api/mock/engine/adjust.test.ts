import { describe, expect, test } from 'vitest'
import { adjustStock } from './adjust'
import { productStock } from './stock'
import { makeScenarioDb } from './test-utils'

describe('adjustStock', () => {
  test('a positive adjustment adds a separate adjustment batch at the average price', () => {
    const db = makeScenarioDb()
    const avgBefore = productStock(db, 'p1').avgPriceKop

    const result = adjustStock(db, 'p1', 4, 'Знайшли на полиці', 'u1')

    expect(result.ok).toBe(true)
    const added = db.batches.find((batch) => batch.adjustment)!
    expect(added).toMatchObject({
      productId: 'p1',
      qtyReceived: 4,
      qtyRemaining: 4,
      unitPriceKop: avgBefore,
      purchaseId: '',
    })
    expect(productStock(db, 'p1').qty).toBe(12)
  })

  test('a product with no history gets an adjustment batch priced at zero', () => {
    const db = makeScenarioDb()
    db.batches = []

    adjustStock(db, 'p1', 2, 'Первинний облік', 'u1')

    expect(db.batches[0].unitPriceKop).toBe(0)
  })

  test('a negative adjustment writes off by FIFO', () => {
    const db = makeScenarioDb()

    const result = adjustStock(db, 'p1', -4, 'Брак', 'u1')

    expect(result.ok).toBe(true)
    expect(db.batches.find((batch) => batch.id === 'b1')!.qtyRemaining).toBe(0)
    expect(db.batches.find((batch) => batch.id === 'b2')!.qtyRemaining).toBe(4)
  })

  test('removing exactly all the stock is allowed and leaves zero', () => {
    const db = makeScenarioDb()

    expect(adjustStock(db, 'p1', -8, 'Списання залишку', 'u1').ok).toBe(true)
    expect(productStock(db, 'p1').qty).toBe(0)
  })

  test('removing more than is in stock is rejected: negative stock is forbidden', () => {
    const db = makeScenarioDb()
    const before = structuredClone(db)

    const result = adjustStock(db, 'p1', -9, 'Хибна кількість', 'u1')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('заборонені')
    expect(db).toEqual(before)
  })

  test('requires a reason, a non-zero quantity and an existing product', () => {
    const db = makeScenarioDb()

    expect(adjustStock(db, 'p1', 1, '  ', 'u1')).toEqual({
      ok: false,
      error: 'Вкажіть причину коригування.',
    })
    expect(adjustStock(db, 'p1', 0, 'Причина', 'u1')).toEqual({
      ok: false,
      error: 'Вкажіть кількість, відмінну від нуля.',
    })
    expect(adjustStock(db, 'nope', 1, 'Причина', 'u1')).toEqual({
      ok: false,
      error: 'Товар не знайдено.',
    })
  })

  test('records an inventory.adjust entry with the reason', () => {
    const db = makeScenarioDb()

    adjustStock(db, 'p1', 1, 'Знайшли', 'u1')

    expect(db.audit).toHaveLength(1)
    expect(db.audit[0]).toMatchObject({ action: 'inventory.adjust', reason: 'Знайшли' })
  })
})
