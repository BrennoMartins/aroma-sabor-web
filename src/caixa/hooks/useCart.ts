import { useCallback, useMemo, useState } from 'react'
import type { Product } from '../../shared/api/products'
import { fromCents, toCents } from '../utils/money'

export type CartItem = {
  productId: number
  name: string
  // Effective unit price for this sale (negotiated or catalog).
  price: number
  // Price registered in the product catalog when the item was added.
  catalogPrice: number
  barcode: string
  quantity: number
}

type CartState = {
  items: CartItem[]
  discountCents: number
  discountResetCount: number
}

function toCartItem(product: Product): CartItem {
  return {
    productId: product.id,
    name: product.name,
    price: product.price,
    catalogPrice: product.price,
    barcode: product.barcode,
    quantity: 1,
  }
}

export function addProductToCart(currentItems: CartItem[], product: Product): CartItem[] {
  const existingItem = currentItems.find((item) => item.productId === product.id)

  if (!existingItem) {
    return [...currentItems, toCartItem(product)]
  }

  return currentItems.map((item) =>
    item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
  )
}

export function calculateSubtotalCents(items: CartItem[]) {
  return items.reduce((sum, item) => sum + toCents(item.price) * item.quantity, 0)
}

export function calculateCartTotals(items: CartItem[], discountAmount = 0) {
  const subtotalCents = calculateSubtotalCents(items)
  const discountCents = toCents(discountAmount)

  return {
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: fromCents(subtotalCents),
    discountAmount: fromCents(discountCents),
    total: fromCents(subtotalCents - discountCents),
  }
}

// A discount that no longer fits the subtotal is dropped explicitly and signalled via discountResetCount.
function withValidDiscount(state: CartState): CartState {
  if (state.discountCents > calculateSubtotalCents(state.items)) {
    return { ...state, discountCents: 0, discountResetCount: state.discountResetCount + 1 }
  }

  return state
}

function mapItems(state: CartState, update: (items: CartItem[]) => CartItem[]): CartState {
  return withValidDiscount({ ...state, items: update(state.items) })
}

export function useCart() {
  const [state, setState] = useState<CartState>({ items: [], discountCents: 0, discountResetCount: 0 })
  const { items, discountCents, discountResetCount } = state

  const addProduct = useCallback((product: Product) => {
    setState((current) => mapItems(current, (currentItems) => addProductToCart(currentItems, product)))
  }, [])

  const removeItem = useCallback((productId: number) => {
    setState((current) =>
      mapItems(current, (currentItems) => currentItems.filter((item) => item.productId !== productId)),
    )
  }, [])

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    setState((current) =>
      mapItems(current, (currentItems) =>
        currentItems.flatMap((item) => {
          if (item.productId !== productId) {
            return [item]
          }

          if (quantity <= 0) {
            return []
          }

          return [{ ...item, quantity }]
        }),
      ),
    )
  }, [])

  const incrementItem = useCallback((productId: number) => {
    setState((current) =>
      mapItems(current, (currentItems) =>
        currentItems.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      ),
    )
  }, [])

  const decrementItem = useCallback((productId: number) => {
    setState((current) =>
      mapItems(current, (currentItems) =>
        currentItems.flatMap((item) => {
          if (item.productId !== productId) {
            return [item]
          }

          if (item.quantity === 1) {
            return []
          }

          return [{ ...item, quantity: item.quantity - 1 }]
        }),
      ),
    )
  }, [])

  const updateUnitPrice = useCallback((productId: number, unitPrice: number) => {
    if (!Number.isFinite(unitPrice) || toCents(unitPrice) <= 0) {
      return
    }

    setState((current) =>
      mapItems(current, (currentItems) =>
        currentItems.map((item) =>
          item.productId === productId ? { ...item, price: fromCents(toCents(unitPrice)) } : item,
        ),
      ),
    )
  }, [])

  const setDiscountAmount = useCallback((amount: number) => {
    const cents = toCents(amount)

    setState((current) => {
      if (!Number.isFinite(amount) || cents < 0 || cents > calculateSubtotalCents(current.items)) {
        return current
      }

      return { ...current, discountCents: cents }
    })
  }, [])

  const clearDiscount = useCallback(() => {
    setState((current) => ({ ...current, discountCents: 0 }))
  }, [])

  const clearCart = useCallback(() => {
    setState((current) => ({ ...current, items: [], discountCents: 0 }))
  }, [])

  const { totalItems, subtotal, discountAmount, total } = useMemo(
    () => calculateCartTotals(items, fromCents(discountCents)),
    [items, discountCents],
  )

  return {
    items,
    totalItems,
    subtotal,
    discountAmount,
    total,
    discountResetCount,
    addProduct,
    removeItem,
    updateQuantity,
    incrementItem,
    decrementItem,
    updateUnitPrice,
    setDiscountAmount,
    clearDiscount,
    clearCart,
  }
}
