import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../shared/components/Button/Button'
import { CartTable } from '../components/CartTable'
import { CheckoutModal } from '../components/CheckoutModal'
import { ScannerStatus } from '../components/ScannerStatus'
import { TotalPanel } from '../components/TotalPanel'
import { useCart } from '../hooks/useCart'
import { getCheckoutErrorMessage } from '../services/checkoutErrorMessage'
import { createSale } from '../services/saleApi'
import { getByBarcode } from '../../shared/api/products'
import { useBarcodeScanner } from '../../scanner/useBarcodeScanner'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog'
import { loadingOverlay } from '../../shared/components/LoadingOverlay/loading-overlay-store'
import { toast } from '../../shared/components/Toast/toast-store'
import { getProductLookupErrorMessage } from '../services/productLookupErrorMessage'
import { OpenMarketModal } from '../../turn/components/OpenMarketModal'
import { useMarketSession } from '../../turn/hooks/useMarketSession'
import { getTurnErrorMessage } from '../../turn/services/turnErrorMessage'
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
  const { lastBarcode, onScan, isScanning } = useBarcodeScanner()
  const { isOpen, isLoading: isTurnLoading, openMarket, isOpening } = useMarketSession()
  const queryClient = useQueryClient()
  const [scanSignal, setScanSignal] = useState(0)
  const [successSignal, setSuccessSignal] = useState(0)
  const [errorSignal, setErrorSignal] = useState(0)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isSaleSuccessVisible, setIsSaleSuccessVisible] = useState(false)
  const [isOpenMarketModalVisible, setIsOpenMarketModalVisible] = useState(false)
  const [openMarketError, setOpenMarketError] = useState<string | null>(null)
  const scannerAnchorRef = useRef<HTMLDivElement | null>(null)
  const successTimeoutRef = useRef<number | null>(null)
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
  const isAnyModalOpen = isCheckoutOpen || isCancelDialogOpen
  const isMarketOpen = isOpen

  const focusScannerAnchor = useCallback(() => {
    window.requestAnimationFrame(() => {
      scannerAnchorRef.current?.focus()
    })
  }, [])

  const productLookup = useMutation({
    mutationFn: getByBarcode,
    onSuccess: (product) => {
      addProduct(product)
      toast.info(`${product.name} adicionado ao carrinho.`)
    },
    onError: (error) => {
      toast.error(getProductLookupErrorMessage(error))
      setErrorSignal((currentValue) => currentValue + 1)
    },
  })

  const handleScan = useEffectEvent((barcode: string) => {
    setScanSignal((currentValue) => currentValue + 1)

    if (isAnyModalOpen || !isMarketOpen) {
      return
    }

    productLookup.mutate(barcode)
  })

  const checkoutMutation = useMutation({
    mutationFn: createSale,
    onMutate: () => {
      isSubmittingSaleRef.current = true
      loadingOverlay.show('Concluindo venda...')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries()
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

      <h2 className="page-card__title">Caixa PDV</h2>

      <div className={styles.scannerPanel} aria-live="polite">
        <div className={styles.scannerRow}>
          <span className={styles.scannerLabel}>Scanner:</span>
          <strong>{isScanning ? '🟢 Código recebido' : '🟢 Aguardando leitura'}</strong>
        </div>

        <div className={styles.scannerRow}>
          <span className={styles.scannerLabel}>Último código:</span>
          <strong>{lastBarcode ?? 'Nenhum'}</strong>
        </div>
      </div>

      <ScannerStatus
        lastBarcode={lastBarcode}
        scanSignal={scanSignal}
        successSignal={successSignal}
        errorSignal={errorSignal}
      />

      <p className="page-card__description">
        Escaneie produtos com o Honeywell Orbit para montar o carrinho e concluir a venda sem sair do fluxo.
      </p>

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
        <div className={styles.content}>
          <CartTable
            items={items}
            onIncrement={handleIncrementItem}
            onDecrement={handleDecrementItem}
            onRemove={handleRemoveItem}
          />

          <TotalPanel total={total} totalItems={totalItems} />
        </div>
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