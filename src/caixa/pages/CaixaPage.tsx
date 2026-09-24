import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { CartTable } from '../components/CartTable'
import { CheckoutModal } from '../components/CheckoutModal'
import { ScannerStatus } from '../components/ScannerStatus'
import { TotalPanel } from '../components/TotalPanel'
import { useCart } from '../hooks/useCart'
import { createSale } from '../services/saleApi'
import { getByBarcode } from '../../shared/api/products'
import { useBarcodeScanner } from '../../scanner/useBarcodeScanner'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog'
import { loadingOverlay } from '../../shared/components/LoadingOverlay/loading-overlay-store'
import { toast } from '../../shared/components/Toast/toast-store'

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
  const { lastBarcode, onScan } = useBarcodeScanner()
  const [successSignal, setSuccessSignal] = useState(0)
  const [errorSignal, setErrorSignal] = useState(0)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
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

  const productLookup = useMutation({
    mutationFn: getByBarcode,
    onSuccess: (product) => {
      addProduct(product)
      toast.info(`${product.name} adicionado ao carrinho.`)
    },
    onError: (error) => {
      const isNotFound =
        error instanceof AxiosError &&
        (error.response?.status === 404 || error.response?.status === 400)

      toast.error(isNotFound ? 'Produto nao encontrado.' : 'Nao foi possivel buscar o produto.')
      setErrorSignal((currentValue) => currentValue + 1)
    },
  })

  const handleScan = useEffectEvent((barcode: string) => {
    productLookup.mutate(barcode)
  })

  const checkoutMutation = useMutation({
    mutationFn: createSale,
    onMutate: () => {
      loadingOverlay.show('Concluindo venda...')
    },
    onSuccess: () => {
      toast.success('Venda concluida.')
      setSuccessSignal((currentValue) => currentValue + 1)
      clearCart()
      setIsCheckoutOpen(false)
    },
    onError: () => {
      toast.error('Nao foi possivel concluir a venda.')
      setErrorSignal((currentValue) => currentValue + 1)
    },
    onSettled: () => {
      loadingOverlay.hide()
    },
  })

  const handleConfirmSale = () => {
    if (items.length === 0) {
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

  useEffect(() => {
    const unsubscribe = onScan((barcode) => {
      handleScan(barcode)
    })

    return () => {
      unsubscribe()
    }
  }, [onScan])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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

        if (isCheckoutOpen) {
          setIsCheckoutOpen(false)
          return
        }

        if (items.length > 0) {
          setIsCancelDialogOpen(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClearCart, isCheckoutOpen, items.length])

  return (
    <section className="page-card caixa-page">
      <h2 className="page-card__title">Caixa PDV</h2>

      <ScannerStatus lastBarcode={lastBarcode} successSignal={successSignal} errorSignal={errorSignal} />

      <p className="page-card__description">
        Escaneie produtos com o Honeywell Orbit para buscar no backend e montar o carrinho.
      </p>

      <div className="caixa-page__content">
        <CartTable
          items={items}
          onIncrement={incrementItem}
          onDecrement={decrementItem}
          onRemove={removeItem}
        />

        <TotalPanel total={total} totalItems={totalItems} />
      </div>

      {productLookup.isPending ? <p className="inline-status">Buscando produto...</p> : null}

      <CheckoutModal
        isOpen={isCheckoutOpen}
        totalItems={totalItems}
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
    </section>
  )
}