import { useCallback, useMemo, useState } from 'react'
import type { Product } from '../../shared/api/products'

export type CartItem = {
  productId: number
  name: string
  price: number
  barcode: string
  quantity: number
}

function toCartItem(product: Product): CartItem {
  return {
    productId: product.id,
    name: product.name,
    price: product.price,
    barcode: product.barcode,
    quantity: 1,
  }
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])

  const addProduct = useCallback((product: Product) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.productId === product.id)

      if (!existingItem) {
        return [...currentItems, toCartItem(product)]
      }

      return currentItems.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      )
    })
  }, [])

  const removeItem = useCallback((productId: number) => {
    setItems((currentItems) => currentItems.filter((item) => item.productId !== productId))
  }, [])

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    setItems((currentItems) =>
      currentItems.flatMap((item) => {
        if (item.productId !== productId) {
          return [item]
        }

        if (quantity <= 0) {
          return []
        }

        return [{ ...item, quantity }]
      }),
    )
  }, [])

  const incrementItem = useCallback((productId: number) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      ),
    )
  }, [])

  const decrementItem = useCallback((productId: number) => {
    setItems((currentItems) =>
      currentItems.flatMap((item) => {
        if (item.productId !== productId) {
          return [item]
        }

        if (item.quantity === 1) {
          return []
        }

        return [{ ...item, quantity: item.quantity - 1 }]
      }),
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  )

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  )

  return {
    items,
    totalItems,
    total,
    addProduct,
    removeItem,
    updateQuantity,
    incrementItem,
    decrementItem,
    clearCart,
  }
}