import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useBarcodeScanner } from '../../scanner/useBarcodeScanner'
import { toast } from '../../shared/components/Toast/toast-store'
import {
  createProduct,
  getProductByBarcode,
  type CreateProductRequest,
  type ProductRecord,
} from '../services/productApi'

type AudioContextWithWebkit = typeof window & {
  webkitAudioContext?: typeof AudioContext
}

export type SmartRegistrationFeedback = 'idle' | 'found' | 'new' | 'error'

const FEEDBACK_DURATION_MS = 340
const FOUND_FREQUENCY_HZ = 880
const NEW_PRODUCT_FREQUENCY_HZ = 660
const ERROR_FREQUENCY_HZ = 220
const SHORT_BEEP_DURATION_SECONDS = 0.11
const LONG_BEEP_DURATION_SECONDS = 0.18

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName

  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target.isContentEditable
}

async function playTone(
  audioContextRef: React.MutableRefObject<AudioContext | null>,
  frequency: number,
  duration: number,
) {
  const audioWindow = window as AudioContextWithWebkit
  const AudioContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext

  if (!AudioContextConstructor) {
    return
  }

  if (!audioContextRef.current) {
    audioContextRef.current = new AudioContextConstructor()
  }

  const audioContext = audioContextRef.current

  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
  gainNode.gain.setValueAtTime(0.001, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.14, audioContext.currentTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + duration)
}

function normalizeBarcode(value: string) {
  return value.trim()
}

export function useSmartProductRegistration() {
  const { onScan } = useBarcodeScanner()
  const [activeModal, setActiveModal] = useState<'none' | 'register' | 'restock'>('none')
  const [registrationBarcode, setRegistrationBarcode] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null)
  const [manualBarcode, setManualBarcode] = useState('')
  const [feedback, setFeedback] = useState<SmartRegistrationFeedback>('idle')
  const feedbackTimeoutRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const manualSearchInputRef = useRef<HTMLInputElement | null>(null)

  const triggerFeedback = useCallback((variant: SmartRegistrationFeedback) => {
    setFeedback(variant)

    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current)
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback('idle')
    }, FEEDBACK_DURATION_MS)

    if (variant === 'found') {
      void playTone(audioContextRef, FOUND_FREQUENCY_HZ, SHORT_BEEP_DURATION_SECONDS)
      return
    }

    if (variant === 'new') {
      void playTone(audioContextRef, NEW_PRODUCT_FREQUENCY_HZ, SHORT_BEEP_DURATION_SECONDS)
      return
    }

    if (variant === 'error') {
      void playTone(audioContextRef, ERROR_FREQUENCY_HZ, LONG_BEEP_DURATION_SECONDS)
    }
  }, [])

  const closeAllModals = useCallback(() => {
    setActiveModal('none')
    setSelectedProduct(null)
    setRegistrationBarcode(null)
  }, [])

  const lookupProductMutation = useMutation({
    mutationFn: async (barcode: string) => {
      try {
        return await getProductByBarcode(barcode)
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 404) {
          return null
        }

        throw error
      }
    },
    onSuccess: (product, barcode) => {
      if (product) {
        setSelectedProduct(product)
        setRegistrationBarcode(null)
        setActiveModal('restock')
        triggerFeedback('found')
        toast.info('Produto encontrado. Informe a quantidade para reposicao.')
        return
      }

      setSelectedProduct(null)
      setRegistrationBarcode(barcode)
      setActiveModal('register')
      triggerFeedback('new')
      toast.info('Produto novo detectado. Complete o cadastro.')
    },
    onError: () => {
      triggerFeedback('error')
      toast.error('Nao foi possivel consultar o produto pelo codigo de barras.')
    },
  })

  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (createdProduct) => {
      toast.success(`${createdProduct.name} cadastrado com sucesso.`)
      closeAllModals()
      setManualBarcode('')
      triggerFeedback('found')
    },
    onError: () => {
      triggerFeedback('error')
      toast.error('Nao foi possivel salvar o produto.')
    },
  })

  const processBarcode = useCallback((rawBarcode: string) => {
    const barcode = normalizeBarcode(rawBarcode)

    if (!barcode) {
      return
    }

    if (activeModal !== 'none' || lookupProductMutation.isPending || createProductMutation.isPending) {
      return
    }

    setManualBarcode(barcode)
    lookupProductMutation.mutate(barcode)
  }, [activeModal, createProductMutation.isPending, lookupProductMutation])

  const submitNewProduct = useCallback((payload: CreateProductRequest) => {
    createProductMutation.mutate(payload)
  }, [createProductMutation])

  const submitRestock = useCallback((quantity: number) => {
    if (!selectedProduct) {
      return
    }

    toast.info(`Reposicao de ${quantity} un. para ${selectedProduct.name} preparada para integrar na API.`)
    closeAllModals()
    setManualBarcode('')
    triggerFeedback('found')
  }, [closeAllModals, selectedProduct, triggerFeedback])

  const runManualSearch = useCallback(() => {
    processBarcode(manualBarcode)
  }, [manualBarcode, processBarcode])

  const focusManualSearch = useCallback(() => {
    manualSearchInputRef.current?.focus()
    manualSearchInputRef.current?.select()
  }, [])

  useEffect(() => {
    const unsubscribe = onScan((barcode) => {
      processBarcode(barcode)
    })

    return () => {
      unsubscribe()
    }
  }, [onScan, processBarcode])

  useEffect(() => {
    const shortcutHandlers: Record<string, () => void> = {
      F2: () => {
        focusManualSearch()
      },
      Escape: () => {
        if (activeModal !== 'none') {
          closeAllModals()
        }
      },
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const handler = shortcutHandlers[event.key]

      if (!handler) {
        return
      }

      if (event.key !== 'F2' && isTypingTarget(event.target)) {
        return
      }

      event.preventDefault()
      handler()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeModal, closeAllModals, focusManualSearch])

  useEffect(() => {
    const audioContext = audioContextRef.current

    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current)
      }

      if (audioContext) {
        void audioContext.close()
      }
    }
  }, [])

  return {
    activeModal,
    registrationBarcode,
    selectedProduct,
    manualBarcode,
    setManualBarcode,
    runManualSearch,
    focusManualSearch,
    manualSearchInputRef,
    feedback,
    isCheckingProduct: lookupProductMutation.isPending,
    isSavingProduct: createProductMutation.isPending,
    submitNewProduct,
    submitRestock,
    closeAllModals,
  }
}
