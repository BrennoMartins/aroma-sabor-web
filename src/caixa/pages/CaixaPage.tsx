import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Button } from '../../shared/components/Button/Button'
import { CartTable } from '../components/CartTable'
import { CheckoutModal } from '../components/CheckoutModal'
import { ManualProductModal } from '../components/ManualProductModal'
import { MoneyAmountModal } from '../components/MoneyAmountModal'
import { ScannerAudioFeedback } from '../components/ScannerAudioFeedback'
import { TotalPanel } from '../components/TotalPanel'
import { getProductAdditionError, useCart } from '../hooks/useCart'
import { getCheckoutErrorMessage } from '../services/checkoutErrorMessage'
import { createSale } from '../services/saleApi'
import { formatCurrency, fromCents, toCents } from '../utils/money'
import { getByBarcode } from '../../shared/api/products'
import type { Product } from '../../shared/api/products'
import { useBarcodeScanner } from '../../scanner/useBarcodeScanner'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog'
import { loadingOverlay } from '../../shared/components/LoadingOverlay/loading-overlay-store'
import { toast } from '../../shared/components/Toast/toast-store'
import { getProductLookupErrorMessage } from '../services/productLookupErrorMessage'
import { OpenMarketModal } from '../../turn/components/OpenMarketModal'
import { useMarketSession } from '../../turn/hooks/useMarketSession'
import { turnSummaryQueryKey } from '../../turn/hooks/useTurnSummary'
import { getTurnErrorMessage } from '../../turn/services/turnErrorMessage'
import { PRODUCTS_QUERY_KEY } from '../../product/hooks/useProducts'
import { SALES_QUERY_KEY } from '../../sales/hooks/useSalesHistory'
import { STOCK_MOVEMENTS_QUERY_KEY } from '../../inventory/hooks/useStockMovements'
import { DASHBOARD_QUERY_KEY } from '../../dashboard/hooks/useDashboardSummary'
import {
  DASHBOARD_LOW_STOCK_QUERY_KEY,
  DASHBOARD_TOP_PRODUCTS_QUERY_KEY,
} from '../../dashboard/hooks/useDashboardProducts'
import { ProductForm } from '../../product/components/ProductForm'
import { createProduct, type CreateProductRequest } from '../../product/services/productApi'
import styles from './CaixaPage.module.css'

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName

  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    target.isContentEditable
  )
}

export function CaixaPage() {
  const { onScan } = useBarcodeScanner()
  const { currentTurn, isOpen, isLoading: isTurnLoading, openMarket, isOpening } = useMarketSession()
  const queryClient = useQueryClient()
  const [scanSignal, setScanSignal] = useState(0)
  const [successSignal, setSuccessSignal] = useState(0)
  const [errorSignal, setErrorSignal] = useState(0)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [missingProductBarcode, setMissingProductBarcode] = useState<string | null>(null)
  const [isProductFormOpen, setIsProductFormOpen] = useState(false)
  const [isSaleSuccessVisible, setIsSaleSuccessVisible] = useState(false)
  const [isOpenMarketModalVisible, setIsOpenMarketModalVisible] = useState(false)
  const [isManualProductOpen, setIsManualProductOpen] = useState(false)
  const [openMarketError, setOpenMarketError] = useState<string | null>(null)
  const scannerAnchorRef = useRef<HTMLDivElement | null>(null)
  const successTimeoutRef = useRef<number | null>(null)
  const isSubmittingSaleRef = useRef(false)
  const {
    items,
    subtotal,
    discountAmount,
    total,
    totalItems,
    discountResetCount,
    addProduct,
    incrementItem,
    decrementItem,
    removeItem,
    updateUnitPrice,
    setDiscountAmount,
    clearDiscount,
    clearCart,
  } = useCart()
  const [isDiscountOpen, setIsDiscountOpen] = useState(false)
  const [priceEditProductId, setPriceEditProductId] = useState<number | null>(null)
  const priceEditItem = items.find((item) => item.productId === priceEditProductId) ?? null
  const isAnyModalOpen =
    isCheckoutOpen ||
    isCancelDialogOpen ||
    isDiscountOpen ||
    priceEditItem !== null ||
    missingProductBarcode !== null ||
    isProductFormOpen ||
    isOpenMarketModalVisible ||
    isManualProductOpen
  const isMarketOpen = isOpen

  const focusScannerAnchor = useCallback(() => {
    window.requestAnimationFrame(() => {
      scannerAnchorRef.current?.focus()
    })
  }, [])

  const productLookup = useMutation({
    mutationFn: getByBarcode,
    onSuccess: (product) => {
      const error = getProductAdditionError(items, product, 1)
      if (error) {
        toast.error(error)
        setErrorSignal((currentValue) => currentValue + 1)
        return
      }

      addProduct(product)
      toast.info(`${product.name} adicionado ao carrinho.`)
    },
    onError: (error, barcode) => {
      if (isAxiosError(error) && error.response?.status === 404) {
        setMissingProductBarcode(barcode)
        setErrorSignal((currentValue) => currentValue + 1)
        return
      }

      toast.error(getProductLookupErrorMessage(error))
      setErrorSignal((currentValue) => currentValue + 1)
    },
  })

  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: async (createdProduct) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_LOW_STOCK_QUERY_KEY }),
      ])
      toast.success(`${createdProduct.name} cadastrado com sucesso. Bipe novamente para adiciona-lo a venda.`)
      setIsProductFormOpen(false)
      setMissingProductBarcode(null)
    },
    onError: () => {
      toast.error('Nao foi possivel salvar o produto.')
    },
  })

  const closeProductRegistration = useCallback(() => {
    if (createProductMutation.isPending) {
      return
    }

    setIsProductFormOpen(false)
    setMissingProductBarcode(null)
  }, [createProductMutation.isPending])

  const handleScan = useEffectEvent((barcode: string) => {
    setScanSignal((currentValue) => currentValue + 1)

    if (
      isAnyModalOpen ||
      !isMarketOpen ||
      productLookup.isPending ||
      isSubmittingSaleRef.current
    ) {
      return
    }

    productLookup.mutate(barcode)
  })

  const handleManualAdd = (product: Product, quantity: number) => {
    if (!isMarketOpen) {
      toast.error('Abra o mercado antes de adicionar produtos.')
      return false
    }

    const error = getProductAdditionError(items, product, quantity)
    if (error) {
      toast.error(error)
      return false
    }

    addProduct(product, quantity)
    toast.info(`${product.name} adicionado ao carrinho.`)
    return true
  }

  const checkoutMutation = useMutation({
    mutationFn: createSale,
    onMutate: () => {
      isSubmittingSaleRef.current = true
      loadingOverlay.show('Concluindo venda...')
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY, exact: true }),
        queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: turnSummaryQueryKey(currentTurn?.id) }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_TOP_PRODUCTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_LOW_STOCK_QUERY_KEY }),
      ])
      toast.success('Venda concluida.')
      setSuccessSignal((currentValue) => currentValue + 1)
      setIsSaleSuccessVisible(true)
      clearCart()
      setIsCheckoutOpen(false)
    },
    onError: (error) => {
      toast.error(getCheckoutErrorMessage(error))
      setErrorSignal((currentValue) => currentValue + 1)
    },
    onSettled: () => {
      isSubmittingSaleRef.current = false
      loadingOverlay.hide()
    },
  })

  const handleConfirmSale = () => {
    if (!isMarketOpen || items.length === 0 || checkoutMutation.isPending || isSubmittingSaleRef.current) {
      return
    }

    if (
      items.some((item) => toCents(item.price) <= 0) ||
      toCents(discountAmount) < 0 ||
      toCents(discountAmount) > toCents(subtotal)
    ) {
      toast.error('Revise precos e desconto antes de finalizar a venda.')
      return
    }

    checkoutMutation.mutate({
      discountAmount,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
    })
  }

  const handleClearCart = useCallback(() => {
    if (items.length === 0) {
      return
    }

    clearCart()
    toast.info('Carrinho limpo.')
    setIsCancelDialogOpen(false)
  }, [clearCart, items.length])

  const handleOpenMarket = async (payload: Parameters<typeof openMarket>[0]) => {
    setOpenMarketError(null)

    try {
      await openMarket(payload)
      setIsOpenMarketModalVisible(false)
    } catch (error) {
      setOpenMarketError(getTurnErrorMessage(error))
    }
  }

  const handleIncrementItem = useCallback((productId: number) => {
    incrementItem(productId)
    focusScannerAnchor()
  }, [focusScannerAnchor, incrementItem])

  const handleDecrementItem = useCallback((productId: number) => {
    decrementItem(productId)
    focusScannerAnchor()
  }, [decrementItem, focusScannerAnchor])

  const handleRemoveItem = useCallback((productId: number) => {
    removeItem(productId)
    focusScannerAnchor()
  }, [focusScannerAnchor, removeItem])

  useEffect(() => {
    const unsubscribe = onScan((barcode) => {
      handleScan(barcode)
    })

    return () => {
      unsubscribe()
    }
  }, [onScan])

  useEffect(() => {
    if (isAnyModalOpen) {
      return
    }

    focusScannerAnchor()
  }, [focusScannerAnchor, isAnyModalOpen])

  useEffect(() => {
    if (!isSaleSuccessVisible) {
      return
    }

    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current)
    }

    successTimeoutRef.current = window.setTimeout(() => {
      setIsSaleSuccessVisible(false)
    }, 1600)

    return () => {
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current)
      }
    }
  }, [isSaleSuccessVisible])

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (discountResetCount > 0) {
      toast.info('Desconto removido: o subtotal ficou menor que o desconto. Aplique novamente, se necessario.')
    }
  }, [discountResetCount])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isAnyModalOpen || !isMarketOpen) {
        return
      }

      // F8 works from inside input fields; it never produces printable characters.
      if (event.key === 'F8') {
        event.preventDefault()

        if (event.repeat) {
          return
        }

        if (items.length > 0) {
          setIsDiscountOpen(true)
        } else {
          toast.info('Adicione itens ao carrinho antes de aplicar desconto.')
        }

        return
      }

      if (event.key === 'F2') {
        if (
          isTypingTarget(event.target) ||
          document.querySelector('[role="dialog"]') !== null ||
          productLookup.isPending ||
          checkoutMutation.isPending ||
          isSubmittingSaleRef.current
        ) {
          return
        }

        event.preventDefault()

        if (!event.repeat) {
          setIsManualProductOpen(true)
        }

        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      if (event.key === 'F9') {
        event.preventDefault()

        if (items.length > 0) {
          setIsCheckoutOpen(true)
        }

        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()

        if (items.length > 0) {
          setIsCancelDialogOpen(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [checkoutMutation.isPending, isAnyModalOpen, isMarketOpen, items.length, productLookup.isPending])

  return (
    <section className={["page-card", styles.page].join(' ')}>
      <div ref={scannerAnchorRef} tabIndex={-1} aria-hidden="true" className={styles.scannerAnchor} />

      <h2 className="page-card__title">CAIXA</h2>

      <ScannerAudioFeedback
        scanSignal={scanSignal}
        successSignal={successSignal}
        errorSignal={errorSignal}
      />

      <div
        className={[
          styles.successNotice,
          isSaleSuccessVisible ? styles.successNoticeVisible : '',
        ].filter(Boolean).join(' ')}
        aria-live="polite"
      >
        Venda concluida. Caixa pronto para a proxima leitura.
      </div>

      {isTurnLoading ? <p className={styles.inlineStatus}>Verificando status do mercado...</p> : null}

      {isMarketOpen ? (
        <>
          <div className={styles.content}>
            <CartTable
              items={items}
              onIncrement={handleIncrementItem}
              onDecrement={handleDecrementItem}
              onRemove={handleRemoveItem}
              onEditPrice={setPriceEditProductId}
            />

            <TotalPanel
              subtotal={subtotal}
              discountAmount={discountAmount}
              total={total}
              totalItems={totalItems}
            />
          </div>
        </>
      ) : isTurnLoading ? null : (
        <div className={styles.closedState} aria-live="polite">
          <div className={styles.closedBadge}>🔴 Mercado Fechado</div>
          <p className={styles.closedTitle}>Abra o mercado para iniciar as vendas.</p>
          <Button type="button" variant="success" onClick={() => setIsOpenMarketModalVisible(true)}>
            Abrir Mercado
          </Button>
        </div>
      )}

      {isMarketOpen && productLookup.isPending ? <p className={styles.inlineStatus}>Buscando produto...</p> : null}

      {isManualProductOpen ? (
        <ManualProductModal
          cartItems={items}
          onAdd={handleManualAdd}
          onClose={() => setIsManualProductOpen(false)}
        />
      ) : null}

      <CheckoutModal
        isOpen={isCheckoutOpen}
        totalItems={totalItems}
        totalProducts={items.length}
        subtotal={subtotal}
        discountAmount={discountAmount}
        total={total}
        isSubmitting={checkoutMutation.isPending}
        onConfirm={handleConfirmSale}
        onCancel={() => setIsCheckoutOpen(false)}
      />

      {isDiscountOpen ? (
        <MoneyAmountModal
          title="Desconto da venda"
          label="Desconto em reais"
          initialValue={discountAmount > 0 ? discountAmount : null}
          confirmLabel="Aplicar desconto"
          details={
            <>
              <span>
                Subtotal: <strong>{formatCurrency(subtotal)}</strong>
              </span>
              <span>
                Desconto aplicado: <strong>{formatCurrency(discountAmount)}</strong>
              </span>
            </>
          }
          validate={(cents) =>
            cents > toCents(subtotal)
              ? `O desconto nao pode ser maior que o subtotal (${formatCurrency(subtotal)}).`
              : null
          }
          onConfirm={(cents) => {
            setDiscountAmount(fromCents(cents))
            setIsDiscountOpen(false)
          }}
          onRemove={
            discountAmount > 0
              ? () => {
                  clearDiscount()
                  setIsDiscountOpen(false)
                }
              : undefined
          }
          removeLabel="Remover desconto"
          onClose={() => setIsDiscountOpen(false)}
        />
      ) : null}

      {priceEditItem ? (
        <MoneyAmountModal
          title="Editar preco unitario"
          label={`Preco unitario de ${priceEditItem.name}`}
          initialValue={priceEditItem.price}
          confirmLabel="Salvar preco"
          details={
            <span>
              Preco cadastrado: <strong>{formatCurrency(priceEditItem.catalogPrice)}</strong>
            </span>
          }
          validate={(cents) => (cents <= 0 ? 'O preco unitario deve ser maior que zero.' : null)}
          onConfirm={(cents) => {
            updateUnitPrice(priceEditItem.productId, fromCents(cents))
            setPriceEditProductId(null)
          }}
          onClose={() => setPriceEditProductId(null)}
        />
      ) : null}

      <ConfirmDialog
        open={isCancelDialogOpen}
        title="Cancelar venda?"
        description="Ao confirmar, todos os itens do carrinho serao removidos e o caixa volta ao estado inicial."
        confirmLabel="Confirmar"
        cancelLabel="Voltar"
        confirmVariant="danger"
        onConfirm={handleClearCart}
        onCancel={() => setIsCancelDialogOpen(false)}
      />

      <ConfirmDialog
        open={missingProductBarcode !== null && !isProductFormOpen}
        title="Produto nao encontrado"
        description="Produto nao encontrado. Deseja cadastra-lo?"
        confirmLabel="Cadastrar produto"
        cancelLabel="Cancelar"
        confirmVariant="success"
        onConfirm={() => setIsProductFormOpen(true)}
        onCancel={closeProductRegistration}
      />

      <ProductForm
        open={isProductFormOpen}
        barcode={missingProductBarcode}
        isSaving={createProductMutation.isPending}
        onSubmit={(payload: CreateProductRequest) => createProductMutation.mutate(payload)}
        onClose={closeProductRegistration}
      />

      <OpenMarketModal
        open={isOpenMarketModalVisible}
        isSubmitting={isOpening}
        errorMessage={openMarketError}
        onClose={() => setIsOpenMarketModalVisible(false)}
        onConfirm={handleOpenMarket}
      />
    </section>
  )
}