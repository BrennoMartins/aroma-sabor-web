// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CaixaPage } from './CaixaPage'
import type { Product } from '../../shared/api/products'

type CartItem = {
  productId: number
  name: string
  price: number
  barcode: string
  quantity: number
}

const createSaleMock = vi.fn()
const getByBarcodeMock = vi.fn()
const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
const toastInfoMock = vi.fn()
const loadingShowMock = vi.fn()
const loadingHideMock = vi.fn()
const useCartMock = vi.fn()
const useMarketSessionMock = vi.fn()

let scannerListener: ((barcode: string) => void) | null = null

vi.mock('../../scanner/useBarcodeScanner', () => ({
  useBarcodeScanner: () => ({
    lastBarcode: null,
    isScanning: false,
    onScan: (listener: (barcode: string) => void) => {
      scannerListener = listener
      return () => {
        if (scannerListener === listener) {
          scannerListener = null
        }
      }
    },
  }),
}))

vi.mock('../../turn/hooks/useMarketSession', () => ({
  useMarketSession: () => useMarketSessionMock(),
}))

vi.mock('../hooks/useCart', () => ({
  useCart: () => useCartMock(),
}))

vi.mock('../services/saleApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/saleApi')>()

  return {
    ...actual,
    createSale: (...args: unknown[]) => createSaleMock(...args),
  }
})

vi.mock('../../shared/api/products', () => ({
  getByBarcode: (...args: unknown[]) => getByBarcodeMock(...args),
}))

vi.mock('../../shared/components/Toast/toast-store', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
    info: (...args: unknown[]) => toastInfoMock(...args),
  },
}))

vi.mock('../../shared/components/LoadingOverlay/loading-overlay-store', () => ({
  loadingOverlay: {
    show: (...args: unknown[]) => loadingShowMock(...args),
    hide: (...args: unknown[]) => loadingHideMock(...args),
  },
}))

function createCartState(items: CartItem[]) {
  return {
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    addProduct: vi.fn(),
    incrementItem: vi.fn(),
    decrementItem: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
  }
}

function createMarketSessionState(isOpen: boolean) {
  return {
    currentTurn: isOpen
      ? {
          id: 'turn-1',
          openedAt: '2026-09-29T09:22:45.000Z',
          closedAt: null,
          operatorName: 'Operador 1',
          status: 'OPEN' as const,
          openingNote: 'Abertura normal',
          closingNote: null,
          durationInMinutes: null,
        }
      : null,
    isOpen,
    isLoading: false,
    error: null,
    isOpening: false,
    isClosing: false,
    openMarket: vi.fn(),
    closeMarket: vi.fn(),
    refreshCurrentTurn: vi.fn(),
  }
}

function createSaleDeferred() {
  let resolve: (value: { id: number; total: number }) => void = () => {}
  let reject: (reason?: unknown) => void = () => {}

  const promise = new Promise<{ id: number; total: number }>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

function pressKey(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

function clickByText(text: string) {
  const button = Array.from(document.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === text,
  )

  if (!button) {
    throw new Error(`Button not found: ${text}`)
  }

  button.dispatchEvent(new MouseEvent('click', { bubbles: true }))

  return button
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('CaixaPage checkout flow', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    createSaleMock.mockReset()
    getByBarcodeMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
    toastInfoMock.mockReset()
    loadingShowMock.mockReset()
    loadingHideMock.mockReset()
    useCartMock.mockReset()
    useMarketSessionMock.mockReset()
    scannerListener = null
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    document.body.innerHTML = ''
  })

  async function renderWithCart(items: CartItem[], isMarketOpen = true) {
    const cartState = createCartState(items)
    useCartMock.mockReturnValue(cartState)
    useMarketSessionMock.mockReturnValue(createMarketSessionState(isMarketOpen))

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <CaixaPage />
        </QueryClientProvider>,
      )
    })

    return cartState
  }

  it('mostra a tela de mercado fechado quando nao ha turno aberto', async () => {
    await renderWithCart([], false)

    expect(document.body.textContent).toContain('Mercado Fechado')
    expect(document.body.textContent).toContain('Abra o mercado para iniciar as vendas.')
    expect(document.body.textContent).toContain('Abrir Mercado')
  })

  it('bloqueia checkout quando o mercado estiver fechado', async () => {
    await renderWithCart([{ productId: 1, name: 'Cafe', price: 10, barcode: '123', quantity: 1 }], false)

    act(() => {
      pressKey('F9')
    })

    expect(document.body.textContent).not.toContain('Confirmar venda')
  })

  it('abre checkout com F9 se carrinho estiver preenchido', async () => {
    await renderWithCart([
      { productId: 1, name: 'Cafe', price: 10, barcode: '123', quantity: 1 },
    ])

    act(() => {
      pressKey('F9')
    })

    expect(document.body.textContent).toContain('Confirmar venda')
  })

  it('fecha checkout ao cancelar', async () => {
    await renderWithCart([
      { productId: 1, name: 'Cafe', price: 10, barcode: '123', quantity: 1 },
    ])

    act(() => {
      pressKey('F9')
    })

    act(() => {
      clickByText('Cancelar')
    })

    expect(document.body.textContent).not.toContain('Confirmar venda')
  })

  it('envia venda com payload correto ao confirmar', async () => {
    createSaleMock.mockResolvedValue({ id: 1, total: 30 })

    await renderWithCart([
      { productId: 10, name: 'Cafe', price: 10, barcode: '123', quantity: 2 },
      { productId: 11, name: 'Pao', price: 5, barcode: '456', quantity: 2 },
    ])

    act(() => {
      pressKey('F9')
    })

    act(() => {
      clickByText('Finalizar venda')
    })

    await flush()

    expect(createSaleMock).toHaveBeenCalledTimes(1)
    expect(createSaleMock.mock.calls[0]?.[0]).toEqual({
      items: [
        { productId: 10, quantity: 2 },
        { productId: 11, quantity: 2 },
      ],
    })
  })

  it('mostra loading durante envio e evita duplo envio', async () => {
    const deferred = createSaleDeferred()
    createSaleMock.mockImplementation(() => deferred.promise)

    await renderWithCart([
      { productId: 1, name: 'Cafe', price: 10, barcode: '123', quantity: 1 },
    ])

    act(() => {
      pressKey('F9')
    })

    act(() => {
      clickByText('Finalizar venda')
      clickByText('Finalizar venda')
    })

    await flush()

    expect(createSaleMock).toHaveBeenCalledTimes(1)
    expect(loadingShowMock).toHaveBeenCalledWith('Concluindo venda...')

    await act(async () => {
      deferred.resolve({ id: 1, total: 10 })
      await deferred.promise
    })

    expect(loadingHideMock).toHaveBeenCalled()
  })

  it('sucesso limpa carrinho e fecha checkout', async () => {
    createSaleMock.mockResolvedValue({ id: 22, total: 10 })

    const cartState = await renderWithCart([
      { productId: 1, name: 'Cafe', price: 10, barcode: '123', quantity: 1 },
    ])

    act(() => {
      pressKey('F9')
    })

    act(() => {
      clickByText('Finalizar venda')
    })

    await flush()

    expect(cartState.clearCart).toHaveBeenCalledTimes(1)
    expect(toastSuccessMock).toHaveBeenCalledWith('Venda concluida.')
    expect(document.body.textContent).not.toContain('Confirmar venda')
  })

  it('erro mantem carrinho e mostra feedback amigavel', async () => {
    createSaleMock.mockRejectedValue({
      isAxiosError: true,
      code: 'ECONNABORTED',
    })

    const cartState = await renderWithCart([
      { productId: 1, name: 'Cafe', price: 10, barcode: '123', quantity: 1 },
    ])

    act(() => {
      pressKey('F9')
    })

    act(() => {
      clickByText('Finalizar venda')
    })

    await flush()

    expect(cartState.clearCart).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Confirmar venda')
    expect(toastErrorMock).toHaveBeenCalledWith('Tempo esgotado ao finalizar venda. Tente novamente.')
  })

  it('scanner continua recebendo leitura apos erro na venda', async () => {
    createSaleMock.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500 },
    })

    const product: Product = {
      id: 1,
      name: 'Cafe',
      price: 10,
      barcode: '123',
    }

    getByBarcodeMock.mockResolvedValue(product)

    const cartState = await renderWithCart([
      { productId: 1, name: 'Cafe', price: 10, barcode: '123', quantity: 1 },
    ])

    act(() => {
      pressKey('F9')
    })

    act(() => {
      clickByText('Finalizar venda')
    })

    await flush()

    act(() => {
      clickByText('Cancelar')
    })

    await act(async () => {
      scannerListener?.('123')
    })

    expect(getByBarcodeMock).toHaveBeenCalled()
    expect(getByBarcodeMock.mock.calls[0]?.[0]).toBe('123')
    expect(cartState.addProduct).toHaveBeenCalledWith(product)
  })
})
