import { useCallback, useEffect, useEffectEvent, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Button } from '../../shared/components/Button/Button'
import { CartTable } from '../components/CartTable'
import { CheckoutModal } from '../components/CheckoutModal'
import { ScannerAudioFeedback } from '../components/ScannerAudioFeedback'
import { TotalPanel } from '../components/TotalPanel'
import { useCart } from '../hooks/useCart'
import { getCheckoutErrorMessage } from '../services/checkoutErrorMessage'
import { createSale } from '../services/saleApi'
import { getByBarcode, searchProductsByName } from '../../shared/api/products'
import type { Product } from '../../shared/api/products'
import { Input } from '../../shared/components/Input/Input'
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

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

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

function getManualNameSearchErrorMessage(error: unknown) {
  if (isAxiosError(error) && error.response?.status === 404) {
    return 'Nao foi possivel pesquisar produtos por nome. Tente novamente.'
  }

  return getProductLookupErrorMessage(error)
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
  const [openMarketError, setOpenMarketError] = useState<string | null>(null)
  const [manualBarcode, setManualBarcode] = useState('')
  const [manualBarcodeMessage, setManualBarcodeMessage] = useState<string | null>(null)
  const [manualName, setManualName] = useState('')
  const [debouncedManualName, setDebouncedManualName] = useState('')
  const [selectedManualProduct, setSelectedManualProduct] = useState<Product | null>(null)
  const [manualAddMessage, setManualAddMessage] = useState<string | null>(null)
  const [isManualAddLocked, setIsManualAddLocked] = useState(false)
  const scannerAnchorRef = useRef<HTMLDivElement | null>(null)
  const manualBarcodeInputRef = useRef<HTMLInputElement | null>(null)
  const manualSearchRef = useRef<HTMLElement | null>(null)
  const successTimeoutRef = useRef<number | null>(null)
  const isManualAddLockedRef = useRef(false)
  const isSubmittingSaleRef = useRef(false)
  const {
    items,
    total,
    totalItems,
    addProduct,
    incrementItem,
    decrementItem,
    removeItem,
    clearCart,
  } = useCart()
  const isAnyModalOpen = isCheckoutOpen || isCancelDialogOpen || missingProductBarcode !== null
  const isMarketOpen = isOpen

  const manualNameQuery = useQuery({
    queryKey: ['cashier-product-search', debouncedManualName],
    queryFn: () => searchProductsByName(debouncedManualName),
    enabled: isMarketOpen && debouncedManualName.length >= 2,
  })

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedManualName(manualName.trim())
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [manualName])

  const focusScannerAnchor = useCallback(() => {
    window.requestAnimationFrame(() => {
      scannerAnchorRef.current?.focus()
    })
  }, [])

  const focusManualBarcodeInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      manualBarcodeInputRef.current?.focus()
    })
  }, [])

  const productLookup = useMutation({
    mutationFn: getByBarcode,
    onSuccess: (product) => {
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

  const manualBarcodeLookup = useMutation({
    mutationFn: getByBarcode,
    onSuccess: (product) => {
      setSelectedManualProduct(product)
      setManualBarcodeMessage('Produto localizado. Confirme e adicione ao carrinho.')
    },
    onError: (error) => {
      setSelectedManualProduct(null)
      setManualBarcodeMessage(getProductLookupErrorMessage(error))
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
      manualBarcodeLookup.isPending ||
      manualSearchRef.current?.contains(document.activeElement)
    ) {
      return
    }

    productLookup.mutate(barcode)
  })

  const handleManualBarcodeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const barcode = manualBarcode.trim()
    if (!barcode || manualBarcodeLookup.isPending) {
      return
    }

    setSelectedManualProduct(null)
    setManualBarcodeMessage(null)
    setManualAddMessage(null)
    manualBarcodeLookup.mutate(barcode)
  }

  const handleManualAdd = () => {
    if (!selectedManualProduct || isManualAddLockedRef.current) {
      return
    }

    isManualAddLockedRef.current = true
    setIsManualAddLocked(true)
    addProduct(selectedManualProduct)
    const message = `${selectedManualProduct.name} adicionado ao carrinho.`
    setManualAddMessage(message)
    toast.info(message)
    setSelectedManualProduct(null)
    setManualName('')
    setDebouncedManualName('')
    focusManualBarcodeInput()
    queueMicrotask(() => {
      isManualAddLockedRef.current = false
      setIsManualAddLocked(false)
    })
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

    checkoutMutation.mutate({
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || isAnyModalOpen || !isMarketOpen) {
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
  }, [isAnyModalOpen, isMarketOpen, items.length])

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
          <section ref={manualSearchRef} className={styles.manualSearch} aria-label="Busca manual de produtos">
            <h3 className={styles.manualSearchTitle}>Localizar produto manualmente</h3>
            <div className={styles.manualSearchGrid}>
              <form className={styles.searchForm} onSubmit={handleManualBarcodeSubmit}>
                <Input
                  label="Código do produto ou código de barras"
                  name="manualBarcode"
                  ref={manualBarcodeInputRef}
                  autoComplete="off"
                  value={manualBarcode}
                  onFocus={() => setManualBarcodeMessage(null)}
                  onChange={(event) => {
                    setManualBarcode(event.target.value)
                    setSelectedManualProduct(null)
                    setManualBarcodeMessage(null)
                  }}
                />
                <Button
                  type="submit"
                  loading={manualBarcodeLookup.isPending}
                  disabled={!manualBarcode.trim()}
                >
                  Buscar código
                </Button>
                {manualBarcodeMessage ? (
                  <p
                    className={manualBarcodeLookup.isError ? styles.searchError : styles.searchStatus}
                    role={manualBarcodeLookup.isError ? 'alert' : 'status'}
                  >
                    {manualBarcodeMessage}
                  </p>
                ) : null}
              </form>

              <div className={styles.searchForm}>
                <Input
                  label="Nome do produto"
                  name="manualProductName"
                  autoComplete="off"
                  value={manualName}
                  onChange={(event) => {
                    setManualName(event.target.value)
                    setSelectedManualProduct(null)
                    setManualAddMessage(null)
                  }}
                />
                {manualName.trim().length < 2 ? (
                  <p className={styles.searchStatus}>Digite ao menos 2 caracteres para pesquisar.</p>
                ) : manualName.trim() !== debouncedManualName ? (
                  <p className={styles.searchStatus} role="status" aria-busy="true">
                    Aguardando sua pesquisa...
                  </p>
                ) : manualNameQuery.isFetching ? (
                  <p className={styles.searchStatus} role="status" aria-busy="true">
                    Pesquisando produtos...
                  </p>
                ) : manualNameQuery.isError ? (
                  <p className={styles.searchError} role="alert">
                    {getManualNameSearchErrorMessage(manualNameQuery.error)}
                  </p>
                ) : manualNameQuery.data?.length ? (
                  <ul className={styles.searchResults} aria-label="Produtos encontrados">
                    {manualNameQuery.data.map((product) => (
                      <li key={product.id}>
                        <button
                          type="button"
                          className={styles.searchResult}
                          aria-pressed={selectedManualProduct?.id === product.id}
                          onClick={() => {
                            setSelectedManualProduct(product)
                            setManualAddMessage(null)
                          }}
                        >
                          <span>
                            <strong>{product.name}</strong>
                            <small>Código: {product.barcode}</small>
                          </span>
                          <span className={styles.resultPrice}>
                            {currencyFormatter.format(product.price)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : manualName.trim() === debouncedManualName ? (
                  <p className={styles.searchStatus} role="status">Nenhum produto encontrado.</p>
                ) : null}
              </div>
            </div>

            {selectedManualProduct ? (
              <div className={styles.selectedProduct} role="status">
                <p>
                  Selecionado: <strong>{selectedManualProduct.name}</strong> · Código {selectedManualProduct.barcode}
                  {' · '}
                  {currencyFormatter.format(selectedManualProduct.price)}
                </p>
                <Button
                  type="button"
                  loading={isManualAddLocked}
                  disabled={isManualAddLocked}
                  onClick={handleManualAdd}
                >
                  Adicionar ao carrinho
                </Button>
              </div>
            ) : null}
            {manualAddMessage ? (
              <p className={styles.manualAddSuccess} role="status" aria-live="polite">
                {manualAddMessage}
              </p>
            ) : null}
          </section>

          <div className={styles.content}>
            <CartTable
              items={items}
              onIncrement={handleIncrementItem}
              onDecrement={handleDecrementItem}
              onRemove={handleRemoveItem}
            />

            <TotalPanel total={total} totalItems={totalItems} />
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

      <CheckoutModal
        isOpen={isCheckoutOpen}
        totalItems={totalItems}
        totalProducts={items.length}
        total={total}
        isSubmitting={checkoutMutation.isPending}
        onConfirm={handleConfirmSale}
        onCancel={() => setIsCheckoutOpen(false)}
      />

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