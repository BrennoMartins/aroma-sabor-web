import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Button } from '../../shared/components/Button/Button'
import { Input } from '../../shared/components/Input/Input'
import { Modal } from '../../shared/components/Modal/Modal'
import { getByBarcode, searchProductsByName } from '../../shared/api/products'
import type { Product } from '../../shared/api/products'
import type { CartItem } from '../hooks/useCart'
import { getProductAdditionError } from '../hooks/useCart'
import { getProductLookupErrorMessage } from '../services/productLookupErrorMessage'
import styles from './ManualProductModal.module.css'

type ManualProductModalProps = {
  cartItems: CartItem[]
  onAdd: (product: Product, quantity: number) => boolean
  onClose: () => void
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function getAvailableStock(product: Product, cartItems: CartItem[]) {
  if (product.stock === undefined) {
    return undefined
  }

  const currentQuantity = cartItems.find((item) => item.productId === product.id)?.quantity ?? 0
  return Math.max(0, product.stock - currentQuantity)
}

function getAvailabilityLabel(product: Product, cartItems: CartItem[]) {
  if (product.active === false) {
    return 'Produto inativo'
  }

  const availableStock = getAvailableStock(product, cartItems)
  if (availableStock === undefined) {
    return null
  }

  return availableStock > 0 ? `Disponível: ${availableStock}` : 'Sem estoque disponível'
}

function isNotFound(error: unknown) {
  return isAxiosError(error) && error.response?.status === 404
}

export function ManualProductModal({ cartItems, onAdd, onClose }: ManualProductModalProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [isAdding, setIsAdding] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const isAddingRef = useRef(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timeout)
  }, [search])

  const searchQuery = useQuery({
    queryKey: ['cashier-product-search', debouncedSearch],
    queryFn: async () => {
      if (/^[\p{L}\p{N}-]+$/u.test(debouncedSearch) && /\d/.test(debouncedSearch)) {
        try {
          return [await getByBarcode(debouncedSearch)]
        } catch (error) {
          if (isNotFound(error)) {
            return searchProductsByName(debouncedSearch)
          }

          throw error
        }
      }

      const products = await searchProductsByName(debouncedSearch)
      if (products.length > 0) {
        return products
      }

      try {
        return [await getByBarcode(debouncedSearch)]
      } catch (error) {
        if (isNotFound(error)) {
          return []
        }

        throw error
      }
    },
    enabled: debouncedSearch.length >= 2,
  })

  const parsedQuantity = Number(quantity)
  const quantityError =
    quantity.trim() === '' || !Number.isInteger(parsedQuantity) || parsedQuantity <= 0
      ? 'Informe uma quantidade inteira maior que zero.'
      : null
  const productAdditionError = selectedProduct
    ? getProductAdditionError(cartItems, selectedProduct, parsedQuantity)
    : null
  const addError = quantityError ?? productAdditionError

  const handleAdd = () => {
    if (!selectedProduct || addError || isAddingRef.current) {
      return
    }

    isAddingRef.current = true
    setIsAdding(true)
    if (onAdd(selectedProduct, parsedQuantity)) {
      onClose()
      return
    }

    isAddingRef.current = false
    setIsAdding(false)
  }

  const isWaitingForDebounce = search.trim() !== debouncedSearch

  return (
    <Modal
      open
      title="Adicionar produto ao carrinho"
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="success" onClick={handleAdd} disabled={!selectedProduct || Boolean(addError)} loading={isAdding}>
            Adicionar ao carrinho
          </Button>
        </>
      }
    >
      <div className={styles.root}>
        <Input
          ref={searchInputRef}
          label="Buscar por nome ou código de barras"
          name="manualProductSearch"
          autoComplete="off"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setSelectedProduct(null)
            setQuantity('1')
          }}
        />

        {search.trim().length < 2 ? (
          <p className={styles.status}>Digite ao menos 2 caracteres para pesquisar.</p>
        ) : isWaitingForDebounce || searchQuery.isFetching ? (
          <p className={styles.status} role="status" aria-busy="true">
            {isWaitingForDebounce ? 'Aguardando sua pesquisa...' : 'Pesquisando produtos...'}
          </p>
        ) : searchQuery.isError ? (
          <p className={styles.error} role="alert">
            {getProductLookupErrorMessage(searchQuery.error)}
          </p>
        ) : searchQuery.data?.length ? (
          <ul className={styles.results} aria-label="Produtos encontrados">
            {searchQuery.data.map((product) => {
              const availability = getAvailabilityLabel(product, cartItems)

              return (
                <li key={product.id}>
                  <button
                    type="button"
                    className={styles.result}
                    aria-pressed={selectedProduct?.id === product.id}
                    disabled={product.active === false}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <span className={styles.productDetails}>
                      <strong>{product.name}</strong>
                      <small>Código de barras: {product.barcode}</small>
                      {availability ? <small>{availability}</small> : null}
                    </span>
                    <span className={styles.price}>{currencyFormatter.format(product.price)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : !isWaitingForDebounce ? (
          <p className={styles.status} role="status">Nenhum produto encontrado.</p>
        ) : null}

        {selectedProduct ? (
          <div className={styles.selection}>
            <p>
              Selecionado: <strong>{selectedProduct.name}</strong>
            </p>
            <Input
              label="Quantidade"
              name="manualQuantity"
              type="number"
              min="1"
              step="1"
              max={selectedProduct.stock === undefined ? undefined : getAvailableStock(selectedProduct, cartItems)}
              value={quantity}
              error={addError ?? undefined}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
