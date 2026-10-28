// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { addProductToCart, calculateCartTotals, useCart } from './useCart'
import type { Product } from '../../shared/api/products'

const coffee: Product = { id: 1, name: 'Cafe', price: 10, barcode: '123' }
const bread: Product = { id: 2, name: 'Pao', price: 5.5, barcode: '456' }

function renderCart() {
  const ref: { current: ReturnType<typeof useCart> | null } = { current: null }

  function Harness() {
    ref.current = useCart()
    return null
  }

  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const container = document.createElement('div')
  const root = createRoot(container)
  act(() => {
    root.render(createElement(Harness))
  })

  return {
    get cart() {
      return ref.current!
    },
    unmount: () => act(() => root.unmount()),
  }
}

describe('cart operations', () => {
  it('incrementa quantidade quando o produto ja existe', () => {
    const items = addProductToCart(
      [{ productId: 1, name: 'Cafe', price: 10, catalogPrice: 10, barcode: '123', quantity: 1 }],
      coffee,
    )

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ productId: 1, quantity: 2 })
  })

  it('adiciona novo item e recalcula totais', () => {
    const items = addProductToCart([], bread)

    expect(items[0]).toMatchObject({ productId: 2, quantity: 1, price: 5.5, catalogPrice: 5.5 })
    expect(calculateCartTotals(items)).toEqual({ totalItems: 1, subtotal: 5.5, discountAmount: 0, total: 5.5 })
  })

  it('soma em centavos sem acumular erro de ponto flutuante', () => {
    const items = [
      { productId: 1, name: 'A', price: 0.1, catalogPrice: 0.1, barcode: '1', quantity: 3 },
      { productId: 2, name: 'B', price: 0.2, catalogPrice: 0.2, barcode: '2', quantity: 3 },
    ]

    expect(calculateCartTotals(items, 0.1)).toMatchObject({ subtotal: 0.9, discountAmount: 0.1, total: 0.8 })
  })

  it('permite desconto igual ao subtotal, resultando em total zero', () => {
    const items = addProductToCart([], coffee)

    expect(calculateCartTotals(items, 10).total).toBe(0)
  })
})

describe('useCart', () => {
  it('comeca sem desconto', () => {
    const harness = renderCart()

    expect(harness.cart.discountAmount).toBe(0)
    expect(harness.cart.total).toBe(0)
    harness.unmount()
  })

  it('edita o preco unitario sem mexer no preco cadastrado e recalcula totais com quantidade maior que um', () => {
    const harness = renderCart()
    act(() => {
      harness.cart.addProduct(coffee)
    })
    act(() => {
      harness.cart.incrementItem(1)
      harness.cart.incrementItem(1)
    })
    act(() => {
      harness.cart.updateUnitPrice(1, 12.35)
    })

    expect(harness.cart.items[0]).toMatchObject({ price: 12.35, catalogPrice: 10, quantity: 3 })
    expect(harness.cart.subtotal).toBe(37.05)
    expect(harness.cart.total).toBe(37.05)

    act(() => {
      harness.cart.updateUnitPrice(1, 8)
    })
    expect(harness.cart.subtotal).toBe(24)
    harness.unmount()
  })

  it('ignora precos zero, negativos ou invalidos', () => {
    const harness = renderCart()
    act(() => {
      harness.cart.addProduct(coffee)
    })
    for (const value of [0, -1, Number.NaN, 0.004]) {
      act(() => {
        harness.cart.updateUnitPrice(1, value)
      })
    }

    expect(harness.cart.items[0].price).toBe(10)
    harness.unmount()
  })

  it('mantem o preco negociado quando o mesmo produto e lido novamente', () => {
    const harness = renderCart()
    act(() => {
      harness.cart.addProduct(coffee)
    })
    act(() => {
      harness.cart.updateUnitPrice(1, 15)
    })
    act(() => {
      harness.cart.addProduct(coffee)
    })

    expect(harness.cart.items).toHaveLength(1)
    expect(harness.cart.items[0]).toMatchObject({ price: 15, quantity: 2 })
    expect(harness.cart.subtotal).toBe(30)
    harness.unmount()
  })

  it('aplica, altera e remove desconto; rejeita valores fora do subtotal', () => {
    const harness = renderCart()
    act(() => {
      harness.cart.addProduct(coffee)
    })
    act(() => {
      harness.cart.setDiscountAmount(3.5)
    })
    expect(harness.cart.discountAmount).toBe(3.5)
    expect(harness.cart.total).toBe(6.5)

    act(() => {
      harness.cart.setDiscountAmount(10.01)
      harness.cart.setDiscountAmount(-1)
    })
    expect(harness.cart.discountAmount).toBe(3.5)

    act(() => {
      harness.cart.setDiscountAmount(10)
    })
    expect(harness.cart.total).toBe(0)

    act(() => {
      harness.cart.clearDiscount()
    })
    expect(harness.cart.discountAmount).toBe(0)
    expect(harness.cart.total).toBe(10)
    harness.unmount()
  })

  it('remove explicitamente o desconto quando o subtotal passa a ser menor', () => {
    const harness = renderCart()
    act(() => {
      harness.cart.addProduct(coffee)
      harness.cart.addProduct(coffee)
    })
    act(() => {
      harness.cart.setDiscountAmount(15)
    })
    expect(harness.cart.discountResetCount).toBe(0)

    act(() => {
      harness.cart.decrementItem(1)
    })
    expect(harness.cart.discountAmount).toBe(0)
    expect(harness.cart.discountResetCount).toBe(1)

    act(() => {
      harness.cart.setDiscountAmount(8)
    })
    act(() => {
      harness.cart.updateUnitPrice(1, 5)
    })
    expect(harness.cart.discountAmount).toBe(0)
    expect(harness.cart.discountResetCount).toBe(2)
    harness.unmount()
  })

  it('limpa o desconto ao limpar o carrinho', () => {
    const harness = renderCart()
    act(() => {
      harness.cart.addProduct(coffee)
    })
    act(() => {
      harness.cart.setDiscountAmount(2)
    })
    act(() => {
      harness.cart.clearCart()
    })

    expect(harness.cart.items).toHaveLength(0)
    expect(harness.cart.discountAmount).toBe(0)
    harness.unmount()
  })
})
