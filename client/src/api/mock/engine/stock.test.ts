import { describe, expect, test } from 'vitest'
import { productStock, totalStockValueKop } from './stock'
import { makeBatch, makeDb } from './test-utils'

describe('productStock', () => {
  test('average price is weighted by the remaining quantity', () => {
    const db = makeDb({
      batches: [
        makeBatch({ id: 'b1', qtyRemaining: 2, unitPriceKop: 1000 }),
        makeBatch({ id: 'b2', qtyRemaining: 3, unitPriceKop: 2000 }),
      ],
    })

    const stock = productStock(db, 'p1')

    expect(stock.qty).toBe(5)
    expect(stock.valueKop).toBe(2 * 1000 + 3 * 2000)
    expect(stock.avgPriceKop).toBe(1600)
    expect(stock.inStock).toBe(true)
  })

  test('with nothing left the average price falls back to the whole purchase history', () => {
    const db = makeDb({
      batches: [
        makeBatch({ id: 'b1', qtyReceived: 4, qtyRemaining: 0, unitPriceKop: 1000 }),
        makeBatch({ id: 'b2', qtyReceived: 6, qtyRemaining: 0, unitPriceKop: 2000 }),
      ],
    })

    const stock = productStock(db, 'p1')

    expect(stock.qty).toBe(0)
    expect(stock.valueKop).toBe(0)
    expect(stock.avgPriceKop).toBe(1600)
    expect(stock.inStock).toBe(false)
  })

  test('a product that was never bought has zero price and stock', () => {
    const stock = productStock(makeDb(), 'p1')

    expect(stock).toMatchObject({ qty: 0, valueKop: 0, avgPriceKop: 0, inStock: false })
  })
})

describe('totalStockValueKop', () => {
  test('sums quantity times price over all products', () => {
    const db = makeDb({
      batches: [
        makeBatch({ id: 'b1', qtyRemaining: 2, unitPriceKop: 1000 }),
        makeBatch({ id: 'b2', productId: 'p2', qtyRemaining: 1.5, unitPriceKop: 4000 }),
        makeBatch({ id: 'b3', qtyRemaining: 0, unitPriceKop: 9999 }),
      ],
    })

    expect(totalStockValueKop(db)).toBe(2 * 1000 + 1.5 * 4000)
  })
})
