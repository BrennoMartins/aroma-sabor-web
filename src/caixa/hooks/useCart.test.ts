import { describe, expect, it } from 'vitest'
import { addProductToCart, calculateCartTotals } from './useCart'

describe('cart operations', () => {
  it('incrementa quantidade quando o produto ja existe', () => {
    const items = addProductToCart(
      [
        {
          productId: 1,
          name: 'Cafe',
          price: 10,
          barcode: '123',
          quantity: 1,
        },
      ],
      { id: 1, name: 'Cafe', price: 10, barcode: '123' },
    )

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ productId: 1, quantity: 2 })
  })

  it('adiciona novo item e recalcula totais', () => {
    const items = addProductToCart([], { id: 2, name: 'Pao', price: 5.5, barcode: '456' })

    const totals = calculateCartTotals(items)

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ productId: 2, quantity: 1 })
    expect(totals).toEqual({ totalItems: 1, total: 5.5 })
  })
})