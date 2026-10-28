// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CaixaPage } from './CaixaPage'
import type { Product } from '../../shared/api/products'
import { PRODUCTS_QUERY_KEY } from '../../product/hooks/useProducts'
import { SALES_QUERY_KEY } from '../../sales/hooks/useSalesHistory'
import { STOCK_MOVEMENTS_QUERY_KEY } from '../../inventory/hooks/useStockMovements'
import {
  DASHBOARD_LOW_STOCK_QUERY_KEY,
  DASHBOARD_TOP_PRODUCTS_QUERY_KEY,
} from '../../dashboard/hooks/useDashboardProducts'
import { turnSummaryQueryKey } from '../../turn/hooks/useTurnSummary'

type CartItem = {
  productId: number
  name: string
  price: number
  catalogPrice?: number
  barcode: string
  quantity: number
}

const createSaleMock = vi.fn()
const getByBarcodeMock = vi.fn()
const searchProductsByNameMock = vi.fn()
const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
const toastInfoMock = vi.fn()
const loadingShowMock = vi.fn()
const loadingHideMock = vi.fn()
const useCartMock = vi.fn()
const useMarketSessionMock = vi.fn()
const createProductMock = vi.fn()
const getCategoriesMock = vi.fn()

let scannerListener: ((barcode: string) => void) | null = null

vi.mock('../../scanner/useBarcodeScanner', () => ({
  useBarcodeScanner: () => ({
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
  searchProductsByName: (...args: unknown[]) => searchProductsByNameMock(...args),
  InvalidProductResponseError: class InvalidProductResponseError extends Error {},
}))

vi.mock('../../product/services/productApi', () => ({
  createProduct: (...args: unknown[]) => createProductMock(...args),
}))

vi.mock('../../category/services/categoryApi', () => ({
  getCategories: (...args: unknown[]) => getCategoriesMock(...args),
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

function createCartState(rawItems: CartItem[], discountAmount = 0) {
  const items = rawItems.map((item) => ({ ...item, catalogPrice: item.catalogPrice ?? item.price }))
  const subtotal = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0) / 100

  return {
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    discountAmount,
    total: Math.round((subtotal - discountAmount) * 100) / 100,
    discountResetCount: 0,
    updateUnitPrice: vi.fn(),
    setDiscountAmount: vi.fn(),
    clearDiscount: vi.fn(),
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

function setFieldValue(selector: string, value: string) {
  const field = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector)

  if (!field) {
    throw new Error(`Field not found: ${selector}`)
  }

  const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  valueSetter?.call(field, value)
  field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

async function waitForAnimationFrame() {
  await act(async () => {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
  })
}

describe('CaixaPage checkout flow', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    createSaleMock.mockReset()
    getByBarcodeMock.mockReset()
    searchProductsByNameMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
    toastInfoMock.mockReset()
    loadingShowMock.mockReset()
    loadingHideMock.mockReset()
    useCartMock.mockReset()
    useMarketSessionMock.mockReset()
    createProductMock.mockReset()
    getCategoriesMock.mockReset()
    getCategoriesMock.mockResolvedValue([{ id: 7, name: 'Mercearia', createdAt: '2026-10-25T16:10:22.410136' }])
    scannerListener = null
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    document.body.innerHTML = ''
  })

  async function renderWithCart(items: CartItem[], isMarketOpen = true, discountAmount = 0) {
    const cartState = createCartState(items, discountAmount)
    useCartMock.mockReturnValue(cartState)
    useMarketSessionMock.mockReturnValue(createMarketSessionState(isMarketOpen))

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <CaixaPage />
        </QueryClientProvider>,
      )
    })

    return cartState
  }

  async function waitForNameSearch() {
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 350))
    })
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
  }

  it('mostra a tela de mercado fechado quando nao ha turno aberto', async () => {
    await renderWithCart([], false)

    expect(document.querySelector('h2')?.textContent).toBe('CAIXA')
    expect(document.body.textContent).not.toContain(
      'Escaneie produtos ou localize-os manualmente para montar o carrinho e concluir a venda sem sair do fluxo.',
    )
    expect(document.body.textContent).toContain('Mercado Fechado')
    expect(document.body.textContent).toContain('Abra o mercado para iniciar as vendas.')
    expect(document.body.textContent).toContain('Abrir Mercado')
  })

  it('nao exibe indicadores visuais de status do scanner', async () => {
    await renderWithCart([], false)

    expect(document.body.textContent).not.toContain('Scanner conectado')
    expect(document.body.textContent).not.toContain('Scanner pronto para venda')
    expect(document.body.textContent).not.toContain('Último código')
    expect(document.body.textContent).not.toContain('Aguardando leitura')
    expect(document.body.textContent).not.toContain('Código recebido')
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
      discountAmount: 0,
      items: [
        { productId: 10, quantity: 2, unitPrice: 10 },
        { productId: 11, quantity: 2, unitPrice: 5 },
      ],
    })
  })

  it('envia desconto e preco negociado sem subtotal, total nem custo', async () => {
    createSaleMock.mockResolvedValue({ id: 1, total: 22 })

    await renderWithCart(
      [{ productId: 10, name: 'Cafe', price: 12.5, catalogPrice: 10, barcode: '123', quantity: 2 }],
      true,
      3,
    )

    act(() => {
      pressKey('F9')
    })
    expect(document.body.textContent).toContain('Subtotal')
    expect(document.body.textContent).toContain('Desconto')
    act(() => {
      clickByText('Finalizar venda')
    })
    await flush()

    const payload = createSaleMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(payload).toEqual({
      discountAmount: 3,
      items: [{ productId: 10, quantity: 2, unitPrice: 12.5 }],
    })
    expect(payload).not.toHaveProperty('subtotal')
    expect(payload).not.toHaveProperty('total')
    expect(JSON.stringify(payload)).not.toMatch(/cost/i)
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
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

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
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: PRODUCTS_QUERY_KEY, exact: true })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: STOCK_MOVEMENTS_QUERY_KEY })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: SALES_QUERY_KEY })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: turnSummaryQueryKey('turn-1') })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: DASHBOARD_TOP_PRODUCTS_QUERY_KEY })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: DASHBOARD_LOW_STOCK_QUERY_KEY })
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

  it('informa produto inexistente e oferece cadastro sem alterar itens da venda', async () => {
    getByBarcodeMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    })
    const cartState = await renderWithCart([
      { productId: 1, name: 'Cafe', price: 10, barcode: '123', quantity: 2 },
      { productId: 2, name: 'Pao', price: 4.5, barcode: '456', quantity: 3 },
    ])

    await act(async () => {
      scannerListener?.('789')
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    expect(document.body.textContent).toContain('Produto nao encontrado')
    expect(document.body.textContent).toContain('Deseja cadastra-lo?')
    expect(document.body.textContent).toContain('Cadastrar produto')
    expect(document.body.textContent).toContain('Cafe')
    expect(document.body.textContent).toContain('Pao')
    expect(document.body.textContent).toContain('33,50')
    expect(cartState.clearCart).not.toHaveBeenCalled()
    expect(cartState.addProduct).not.toHaveBeenCalled()
  })

  it('abre o formulario existente sobre o caixa e preserva o codigo e os itens', async () => {
    getByBarcodeMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    })
    const cartState = await renderWithCart([
      { productId: 1, name: 'Cafe', price: 10, barcode: '123', quantity: 2 },
      { productId: 2, name: 'Pao', price: 4.5, barcode: '456', quantity: 3 },
    ])

    await act(async () => {
      scannerListener?.('789')
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    await act(async () => {
      clickByText('Cadastrar produto')
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    expect(document.querySelector('#smart-product-form')).not.toBeNull()
    expect(document.querySelector<HTMLInputElement>('[name="barcode"]')?.value).toBe('789')
    expect(document.body.textContent).toContain('CAIXA')
    expect(document.body.textContent).toContain('Cafe')
    expect(document.body.textContent).toContain('Pao')
    expect(document.body.textContent).toContain('33,50')
    expect(cartState.items).toHaveLength(2)
    expect(cartState.clearCart).not.toHaveBeenCalled()
  })

  it('cancela o cadastro sem limpar o carrinho nem abandonar o caixa', async () => {
    getByBarcodeMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    })
    const cartState = await renderWithCart([
      { productId: 1, name: 'Cafe', price: 10, barcode: '123', quantity: 2 },
      { productId: 2, name: 'Pao', price: 4.5, barcode: '456', quantity: 3 },
    ])

    await act(async () => {
      scannerListener?.('789')
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    await act(async () => {
      clickByText('Cadastrar produto')
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    act(() => {
      clickByText('Cancelar')
    })

    expect(document.querySelector('#smart-product-form')).toBeNull()
    expect(document.body.textContent).toContain('CAIXA')
    expect(document.body.textContent).toContain('Cafe')
    expect(document.body.textContent).toContain('Pao')
    expect(document.body.textContent).toContain('33,50')
    expect(cartState.items).toHaveLength(2)
    expect(cartState.clearCart).not.toHaveBeenCalled()
  })

  it('cadastra, atualiza consultas e permite adicionar com novo escaneamento', async () => {
    const product: Product = {
      id: 9,
      name: 'Produto novo',
      price: 5,
      barcode: '789',
    }
    getByBarcodeMock
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
      .mockResolvedValueOnce(product)
    createProductMock.mockResolvedValueOnce({
      id: 9,
      name: product.name,
      barcode: product.barcode,
      categoryId: 7,
      category: 'Mercearia',
      price: product.price,
      stockQuantity: 4,
      active: true,
    })
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const cartState = await renderWithCart([
      { productId: 1, name: 'Cafe', price: 10, barcode: '123', quantity: 2 },
      { productId: 2, name: 'Pao', price: 4.5, barcode: '456', quantity: 3 },
    ])

    await act(async () => {
      scannerListener?.('789')
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    await act(async () => {
      clickByText('Cadastrar produto')
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    setFieldValue('[name="name"]', 'Produto novo')
    setFieldValue('[name="categoryId"]', '7')
    setFieldValue('[name="price"]', '5')
    setFieldValue('[name="initialStock"]', '0')
    const form = document.querySelector<HTMLFormElement>('#smart-product-form')
    if (!form) {
      throw new Error('Product form not found')
    }
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    expect(createProductMock.mock.calls[0]?.[0]).toEqual({
      barcode: '789',
      name: 'Produto novo',
      categoryId: 7,
      price: 5,
      stock: 0,
    })
    expect(document.querySelector('#smart-product-form')).toBeNull()
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Produto novo cadastrado com sucesso. Bipe novamente para adiciona-lo a venda.',
    )
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: PRODUCTS_QUERY_KEY })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: DASHBOARD_LOW_STOCK_QUERY_KEY })
    expect(cartState.items).toHaveLength(2)
    expect(cartState.clearCart).not.toHaveBeenCalled()
    expect(cartState.addProduct).not.toHaveBeenCalled()
    await waitForAnimationFrame()
    expect(document.activeElement).toBe(document.querySelector('[aria-hidden="true"][tabindex="-1"]'))

    await act(async () => {
      scannerListener?.('789')
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    expect(getByBarcodeMock).toHaveBeenCalledTimes(2)
    expect(cartState.addProduct).toHaveBeenCalledTimes(1)
    expect(cartState.addProduct).toHaveBeenCalledWith(product)
  })

  it('mantem dados preenchidos e o carrinho quando o cadastro falha', async () => {
    getByBarcodeMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    })
    createProductMock.mockRejectedValueOnce(new Error('request failed'))
    const cartState = await renderWithCart([
      { productId: 1, name: 'Cafe', price: 10, barcode: '123', quantity: 2 },
    ])

    await act(async () => {
      scannerListener?.('789')
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    await act(async () => {
      clickByText('Cadastrar produto')
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    setFieldValue('[name="name"]', 'Produto nao salvo')
    setFieldValue('[name="categoryId"]', '7')
    setFieldValue('[name="price"]', '5')
    setFieldValue('[name="initialStock"]', '0')
    const form = document.querySelector<HTMLFormElement>('#smart-product-form')
    if (!form) {
      throw new Error('Product form not found')
    }
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    expect(toastErrorMock).toHaveBeenCalledWith('Nao foi possivel salvar o produto.')
    expect(document.querySelector('#smart-product-form')).not.toBeNull()
    expect(document.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe('Produto nao salvo')
    expect(document.body.textContent).toContain('Cafe')
    expect(cartState.items).toHaveLength(1)
    expect(cartState.clearCart).not.toHaveBeenCalled()
    expect(cartState.addProduct).not.toHaveBeenCalled()
  })

  it('trata falhas tecnicas da busca sem oferecer cadastro', async () => {
    getByBarcodeMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500 },
    })
    const cartState = await renderWithCart([
      { productId: 1, name: 'Cafe', price: 10, barcode: '123', quantity: 1 },
    ])

    await act(async () => {
      scannerListener?.('789')
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    expect(document.body.textContent).not.toContain('Deseja cadastra-lo?')
    expect(document.querySelector('#smart-product-form')).toBeNull()
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Servico indisponivel no momento. Tente novamente.',
    )
    expect(cartState.clearCart).not.toHaveBeenCalled()
    expect(cartState.addProduct).not.toHaveBeenCalled()
  })

  it('localiza pelo codigo digitado e adiciona sem remover itens existentes', async () => {
    const product: Product = {
      id: 8,
      name: 'Cafe Especial',
      price: 18.5,
      barcode: '7890008',
    }
    getByBarcodeMock.mockResolvedValueOnce(product)
    const cartState = await renderWithCart([
      { productId: 1, name: 'Arroz', price: 10, barcode: '111', quantity: 2 },
    ])

    act(() => setFieldValue('[name="manualBarcode"]', '7890008'))
    const barcodeForm = document.querySelector<HTMLFormElement>('[name="manualBarcode"]')?.form
    if (!barcodeForm) {
      throw new Error('Manual barcode form not found')
    }
    act(() => {
      barcodeForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await flush()

    expect(getByBarcodeMock.mock.calls[0]?.[0]).toBe('7890008')
    expect(document.body.textContent).toContain('Produto localizado.')
    expect(document.body.textContent).toContain('Cafe Especial')

    const addButton = Array.from(document.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === 'Adicionar ao carrinho',
    )
    if (!addButton) {
      throw new Error('Manual add button not found')
    }
    await act(async () => {
      addButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      addButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })

    expect(cartState.addProduct).toHaveBeenCalledTimes(1)
    expect(cartState.addProduct).toHaveBeenCalledWith(product)
    expect(cartState.clearCart).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Arroz')
    expect(document.body.textContent).toContain('Cafe Especial adicionado ao carrinho.')
  })

  it('informa que o codigo nao foi encontrado sem oferecer cadastro nem limpar o carrinho', async () => {
    getByBarcodeMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    })
    const cartState = await renderWithCart([
      { productId: 1, name: 'Arroz', price: 10, barcode: '111', quantity: 2 },
    ])

    act(() => setFieldValue('[name="manualBarcode"]', '000'))
    act(() => {
      clickByText('Buscar código')
    })
    await flush()

    expect(document.body.textContent).toContain('Produto nao encontrado.')
    expect(document.body.textContent).not.toContain('Deseja cadastra-lo?')
    expect(cartState.addProduct).not.toHaveBeenCalled()
    expect(cartState.clearCart).not.toHaveBeenCalled()
  })

  it('mostra erro tecnico de codigo sem confundi-lo com produto inexistente', async () => {
    getByBarcodeMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 503 },
    })
    const cartState = await renderWithCart([
      { productId: 1, name: 'Arroz', price: 10, barcode: '111', quantity: 2 },
    ])

    act(() => setFieldValue('[name="manualBarcode"]', '789'))
    act(() => {
      clickByText('Buscar código')
    })
    await flush()

    expect(document.body.textContent).toContain('Servico indisponivel no momento.')
    expect(cartState.items).toHaveLength(1)
    expect(cartState.clearCart).not.toHaveBeenCalled()
  })

  it('pesquisa parte do nome, permite escolher entre resultados e usa o carrinho existente', async () => {
    const selectedProduct: Product = {
      id: 3,
      name: 'Cafe Soluvel',
      price: 9.75,
      barcode: '7893',
    }
    const otherProduct: Product = {
      id: 4,
      name: 'Cafe Torrado',
      price: 14.5,
      barcode: '7894',
    }
    searchProductsByNameMock.mockResolvedValueOnce([otherProduct, selectedProduct])
    const cartState = await renderWithCart([
      { productId: 1, name: 'Arroz', price: 10, barcode: '111', quantity: 2 },
    ])

    act(() => setFieldValue('[name="manualProductName"]', 'cafe'))
    await waitForNameSearch()

    expect(searchProductsByNameMock).toHaveBeenCalledTimes(1)
    expect(searchProductsByNameMock).toHaveBeenCalledWith('cafe')
    expect(document.body.textContent).toContain('Cafe Soluvel')
    expect(document.body.textContent).toContain('Cafe Torrado')
    expect(document.body.textContent).toContain('7893')

    const results = document.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')
    act(() => {
      results[1]?.click()
    })
    expect(document.body.textContent).toContain('Selecionado: Cafe Soluvel')

    await act(async () => {
      clickByText('Adicionar ao carrinho')
      await Promise.resolve()
    })

    expect(cartState.addProduct).toHaveBeenCalledWith(selectedProduct)
    expect(cartState.items).toHaveLength(1)
    expect(cartState.clearCart).not.toHaveBeenCalled()
    expect(document.querySelector<HTMLInputElement>('[name="manualProductName"]')?.value).toBe('')
    expect(document.querySelector('ul[aria-label="Produtos encontrados"]')).toBeNull()
    await waitForAnimationFrame()
    expect(document.activeElement).toBe(document.querySelector('[name="manualBarcode"]'))

    searchProductsByNameMock.mockResolvedValueOnce([otherProduct])
    act(() => setFieldValue('[name="manualProductName"]', 'torrado'))
    await waitForNameSearch()
    expect(document.body.textContent).toContain('Cafe Torrado')
    act(() => {
      document.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')[0]?.click()
    })

    await act(async () => {
      clickByText('Adicionar ao carrinho')
      await Promise.resolve()
    })

    expect(cartState.addProduct).toHaveBeenCalledTimes(2)
    expect(cartState.addProduct).toHaveBeenLastCalledWith(otherProduct)
    expect(document.querySelector<HTMLInputElement>('[name="manualProductName"]')?.value).toBe('')
    expect(document.querySelector('ul[aria-label="Produtos encontrados"]')).toBeNull()
    expect(cartState.items).toHaveLength(1)
    expect(cartState.clearCart).not.toHaveBeenCalled()
  })

  it('apresenta o estado de carregamento e a ausência de resultados da pesquisa por nome', async () => {
    let resolveSearch: ((products: Product[]) => void) | null = null
    searchProductsByNameMock.mockImplementationOnce(() => new Promise((resolve) => {
      resolveSearch = resolve
    }))
    await renderWithCart([])

    act(() => setFieldValue('[name="manualProductName"]', 'inexistente'))
    await waitForNameSearch()

    expect(document.body.textContent).toContain('Pesquisando produtos...')
    await act(async () => {
      resolveSearch?.([])
      await Promise.resolve()
      await new Promise((resolve) => window.setTimeout(resolve, 10))
    })
    expect(document.body.textContent).toContain('Nenhum produto encontrado.')
  })

  it('apresenta erro de API na busca por nome e preserva o carrinho', async () => {
    searchProductsByNameMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500 },
    })
    const cartState = await renderWithCart([
      { productId: 1, name: 'Arroz', price: 10, barcode: '111', quantity: 2 },
    ])

    act(() => setFieldValue('[name="manualProductName"]', 'cafe'))
    await waitForNameSearch()

    expect(document.body.textContent).toContain('Servico indisponivel no momento.')
    expect(cartState.items).toHaveLength(1)
    expect(cartState.addProduct).not.toHaveBeenCalled()
    expect(cartState.clearCart).not.toHaveBeenCalled()
  })

  it('ignora leituras do scanner quando o foco esta na busca manual e mantém o scanner fora dela', async () => {
    const product: Product = {
      id: 8,
      name: 'Cafe Especial',
      price: 18.5,
      barcode: '7890008',
    }
    getByBarcodeMock.mockResolvedValue(product)
    const cartState = await renderWithCart([])

    const barcodeInput = document.querySelector<HTMLInputElement>('[name="manualBarcode"]')
    act(() => {
      barcodeInput?.focus()
      scannerListener?.('7890008')
    })
    expect(getByBarcodeMock).not.toHaveBeenCalled()
    expect(cartState.addProduct).not.toHaveBeenCalled()

    act(() => {
      document.querySelector<HTMLElement>('[aria-hidden="true"][tabindex="-1"]')?.focus()
      scannerListener?.('7890008')
    })
    await flush()

    expect(getByBarcodeMock.mock.calls.at(-1)?.[0]).toBe('7890008')
    expect(cartState.addProduct).toHaveBeenCalledWith(product)
  })
})

describe('CaixaPage desconto e preco unitario', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    createSaleMock.mockReset()
    getByBarcodeMock.mockReset()
    toastInfoMock.mockReset()
    toastErrorMock.mockReset()
    useCartMock.mockReset()
    useMarketSessionMock.mockReset()
    getCategoriesMock.mockReset()
    getCategoriesMock.mockResolvedValue([])
    scannerListener = null
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    document.body.innerHTML = ''
  })

  async function render(items: CartItem[], discountAmount = 0, isMarketOpen = true) {
    const cartState = createCartState(items, discountAmount)
    useCartMock.mockReturnValue(cartState)
    useMarketSessionMock.mockReturnValue(createMarketSessionState(isMarketOpen))
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <CaixaPage />
        </QueryClientProvider>,
      )
    })
    return cartState
  }

  const coffee: CartItem = { productId: 1, name: 'Cafe', price: 10, barcode: '123', quantity: 2 }

  function submitAmount(value: string) {
    act(() => {
      setFieldValue('[name="money-amount"]', value)
    })
    act(() => {
      document.querySelector('#money-amount-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
  }

  it('mostra desconto inicial zero e o atalho F8', async () => {
    await render([coffee])

    expect(document.body.textContent).toContain('Subtotal')
    expect(document.body.textContent).toContain('- R$')
    expect(document.body.textContent).toContain('F8')
  })

  it('abre o desconto com F8, inclusive com foco em input, sem digitar nada nele', async () => {
    await render([coffee])
    const barcodeInput = document.querySelector<HTMLInputElement>('[name="manualBarcode"]')
    barcodeInput?.focus()

    const event = new KeyboardEvent('keydown', { key: 'F8', bubbles: true, cancelable: true })
    act(() => {
      barcodeInput?.dispatchEvent(event)
    })

    expect(event.defaultPrevented).toBe(true)
    expect(document.body.textContent).toContain('Desconto da venda')
    expect(document.body.textContent).not.toContain('Confirmar venda')
    expect(barcodeInput?.value).toBe('')
  })

  it('nao abre F8 sem itens, com mercado fechado ou com outro modal aberto', async () => {
    await render([], 0)
    act(() => {
      pressKey('F8')
    })
    expect(document.body.textContent).not.toContain('Desconto da venda')
    expect(toastInfoMock).toHaveBeenCalled()

    act(() => {
      root.unmount()
    })
    root = createRoot(container)
    await render([coffee], 0, false)
    act(() => {
      pressKey('F8')
    })
    expect(document.body.textContent).not.toContain('Desconto da venda')

    act(() => {
      root.unmount()
    })
    root = createRoot(container)
    await render([coffee])
    act(() => {
      pressKey('F9')
    })
    act(() => {
      pressKey('F8')
    })
    expect(document.body.textContent).not.toContain('Desconto da venda')
    expect(document.body.textContent).toContain('Confirmar venda')
  })

  it('F9 e Escape continuam funcionando e nao agem enquanto o desconto esta aberto', async () => {
    await render([coffee])
    act(() => {
      pressKey('F8')
    })
    act(() => {
      pressKey('F9')
    })
    expect(document.body.textContent).not.toContain('Confirmar venda')
    expect(document.body.textContent).not.toContain('Cancelar venda?')

    act(() => {
      pressKey('Escape')
    })
    expect(document.body.textContent).not.toContain('Desconto da venda')
    expect(document.body.textContent).not.toContain('Cancelar venda?')

    act(() => {
      pressKey('Escape')
    })
    expect(document.body.textContent).toContain('Cancelar venda?')
  })

  it('aplica desconto valido, aceita desconto igual ao subtotal e aceita virgula', async () => {
    const cart = await render([coffee])
    act(() => {
      pressKey('F8')
    })
    submitAmount('5,50')
    expect(cart.setDiscountAmount).toHaveBeenLastCalledWith(5.5)
    expect(document.body.textContent).not.toContain('Desconto da venda')

    act(() => {
      pressKey('F8')
    })
    submitAmount('20')
    expect(cart.setDiscountAmount).toHaveBeenLastCalledWith(20)
  })

  it('rejeita desconto negativo, invalido, com muitas casas ou maior que o subtotal', async () => {
    const cart = await render([coffee])
    act(() => {
      pressKey('F8')
    })

    for (const value of ['-1', 'abc', '', '1,234', '20,01']) {
      submitAmount(value)
      expect(document.querySelector('[role="alert"]')).not.toBeNull()
    }
    expect(cart.setDiscountAmount).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Desconto da venda')
  })

  it('altera e remove o desconto, e cancelar preserva o desconto confirmado', async () => {
    const cart = await render([coffee], 4)
    act(() => {
      pressKey('F8')
    })
    expect(document.querySelector<HTMLInputElement>('[name="money-amount"]')?.value).toBe('4,00')

    act(() => {
      clickByText('Cancelar')
    })
    expect(cart.setDiscountAmount).not.toHaveBeenCalled()
    expect(cart.clearDiscount).not.toHaveBeenCalled()

    act(() => {
      pressKey('F8')
    })
    act(() => {
      clickByText('Remover desconto')
    })
    expect(cart.clearDiscount).toHaveBeenCalledTimes(1)
    expect(document.body.textContent).not.toContain('Desconto da venda')
  })

  it('edita o preco unitario abaixo e acima do cadastrado', async () => {
    const cart = await render([coffee])

    act(() => {
      document.querySelector<HTMLButtonElement>('button[class*="editPriceButton"]')?.click()
    })
    expect(document.body.textContent).toContain('Editar preco unitario')
    submitAmount('7,5')
    expect(cart.updateUnitPrice).toHaveBeenLastCalledWith(1, 7.5)

    act(() => {
      document.querySelector<HTMLButtonElement>('button[class*="editPriceButton"]')?.click()
    })
    submitAmount('15')
    expect(cart.updateUnitPrice).toHaveBeenLastCalledWith(1, 15)
  })

  it('rejeita preco zero, negativo ou invalido e cancela sem alterar o item', async () => {
    const cart = await render([coffee])
    act(() => {
      document.querySelector<HTMLButtonElement>('button[class*="editPriceButton"]')?.click()
    })

    for (const value of ['0', '0,00', '-3', 'abc', '1,999']) {
      submitAmount(value)
      expect(document.querySelector('[role="alert"]')).not.toBeNull()
    }
    expect(cart.updateUnitPrice).not.toHaveBeenCalled()

    act(() => {
      clickByText('Cancelar')
    })
    expect(document.body.textContent).not.toContain('Editar preco unitario')
    expect(cart.updateUnitPrice).not.toHaveBeenCalled()
  })

  it('indica preco negociado diferente do cadastrado', async () => {
    await render([{ ...coffee, price: 12, catalogPrice: 10 }])

    expect(document.body.textContent).toContain('Negociado')
  })

  it('bloqueia leitura do scanner enquanto uma edicao esta aberta', async () => {
    getByBarcodeMock.mockResolvedValue({ id: 2, name: 'Pao', price: 1, barcode: '999' })
    await render([coffee])
    act(() => {
      pressKey('F8')
    })
    act(() => {
      scannerListener?.('999')
    })
    await flush()

    expect(getByBarcodeMock).not.toHaveBeenCalled()
  })
})
