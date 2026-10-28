// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductRecord, StockDiscardResponse } from '../../product/services/productApi'
import { DASHBOARD_LOW_STOCK_QUERY_KEY } from '../../dashboard/hooks/useDashboardProducts'
import { DiscardsPage } from './DiscardsPage'

const {
  getProductsMock,
  discardProductStockMock,
  getStockMovementsMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  getProductsMock: vi.fn(),
  discardProductStockMock: vi.fn(),
  getStockMovementsMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('../../product/services/productApi', () => ({
  STOCK_DISCARD_REASONS: ['DAMAGED', 'EXPIRED', 'UNFIT_FOR_SALE', 'OTHER'],
  getProducts: (...args: unknown[]) => getProductsMock(...args),
  replenishProduct: vi.fn(),
  adjustProductStock: vi.fn(),
  discardProductStock: (...args: unknown[]) => discardProductStockMock(...args),
}))

vi.mock('../services/stockMovementApi', () => ({
  getStockMovements: (...args: unknown[]) => getStockMovementsMock(...args),
  InvalidStockMovementPageError: class InvalidStockMovementPageError extends Error {},
}))

vi.mock('../../shared/components/Toast/toast-store', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}))

const products: ProductRecord[] = [
  {
    id: 7,
    name: 'Arroz',
    barcode: '7891000000007',
    categoryId: 1,
    category: 'Mercearia',
    price: 12,
    costPrice: null,
    stockQuantity: 5,
    active: true,
  },
  {
    id: 8,
    name: 'Leite',
    barcode: '7891000000008',
    categoryId: 1,
    category: 'Mercearia',
    price: 5,
    costPrice: null,
    stockQuantity: 0,
    active: true,
  },
]

const movementPage = {
  content: [
    {
      id: 42,
      productId: 7,
      productName: 'Arroz',
      movementType: 'DISCARD' as const,
      quantity: -2,
      createdAt: '2026-10-25T18:30:00',
      reason: 'Pacote violado',
      discardReason: 'DAMAGED' as const,
      referenceSaleId: null,
    },
  ],
  number: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
  empty: false,
}

const createdDiscard: StockDiscardResponse = {
  id: 43,
  productId: 7,
  productName: 'Arroz',
  movementType: 'DISCARD',
  quantity: -2,
  createdAt: '2026-10-26T09:30:00',
  reason: 'Pacote violado',
  discardReason: 'DAMAGED',
  referenceSaleId: null,
}

function setFieldValue(selector: string, value: string) {
  const field = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector)
  if (!field) {
    throw new Error(`Field not found: ${selector}`)
  }
  act(() => {
    const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(field, value)
    field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
    if (field instanceof HTMLInputElement && field.type === 'search') {
      field.dispatchEvent(new Event('change', { bubbles: true }))
    }
  })
}

describe('DiscardsPage', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })
    getProductsMock.mockReset().mockResolvedValue(products)
    discardProductStockMock.mockReset()
    getStockMovementsMock.mockReset().mockResolvedValue(movementPage)
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
  })

  afterEach(() => {
    act(() => root.unmount())
    queryClient.clear()
    container.remove()
    document.body.innerHTML = ''
  })

  async function render() {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <DiscardsPage />
        </QueryClientProvider>,
      )
    })
    await waitForText('Arroz')
  }

  async function waitForText(text: string) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (document.body.textContent?.includes(text)) {
        return
      }
      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 5))
      })
    }
    throw new Error(`Timed out waiting for text: ${text}`)
  }

  async function submitForm() {
    await act(async () => {
      document.querySelector<HTMLFormElement>('#stock-discard-form')?.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
  }

  async function clickButton(text: string) {
    const button = Array.from(document.body.querySelectorAll('button'))
      .find((candidate) => candidate.textContent?.includes(text))
    await act(async () => {
      button?.click()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
  }

  function fillValidForm() {
    setFieldValue('#discard-product', '7')
    setFieldValue('[name="quantity"]', '2')
    setFieldValue('#discard-reason', 'DAMAGED')
    setFieldValue('[name="observation"]', 'Pacote violado')
  }

  it('exibe formulário, estoque do produto e histórico específico de descartes', async () => {
    await render()
    setFieldValue('#discard-product', '7')

    expect(document.body.textContent).toContain('Registrar perda ou descarte')
    expect(document.body.textContent).toContain('Estoque atual: 5 unidades')
    expect(document.body.textContent).toContain('Produto danificado')
    expect(document.body.textContent).toContain('Histórico de perdas e descartes')
    expect(document.body.textContent).toContain('Pacote violado')
    expect(getStockMovementsMock).toHaveBeenCalledWith({
      movementType: 'DISCARD',
      page: 0,
      size: 20,
    })
  })

  it('pesquisa produto por nome e seleciona para confirmar seu estoque', async () => {
    await render()
    setFieldValue('input[type="search"]', 'leite')

    expect(document.querySelector('#discard-product')?.textContent).toContain('Leite')
    expect(document.querySelector('#discard-product')?.textContent).not.toContain('Arroz')

    setFieldValue('#discard-product', '8')
    expect(document.body.textContent).toContain('Estoque atual: 0 unidades')
  })

  it('valida quantidade positiva inteira e motivo antes de confirmar', async () => {
    await render()
    setFieldValue('#discard-product', '7')
    setFieldValue('[name="quantity"]', '0')
    setFieldValue('#discard-reason', 'DAMAGED')
    await submitForm()

    expect(discardProductStockMock).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('número inteiro maior que zero')

    setFieldValue('[name="quantity"]', '1.5')
    await submitForm()
    expect(discardProductStockMock).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('número inteiro maior que zero')

    setFieldValue('[name="quantity"]', '2')
    setFieldValue('#discard-reason', '')
    await submitForm()
    expect(document.body.textContent).toContain('Selecione um motivo válido.')
  })

  it('impede quantidade maior que o saldo disponível', async () => {
    await render()
    setFieldValue('#discard-product', '7')
    setFieldValue('[name="quantity"]', '6')
    setFieldValue('#discard-reason', 'OTHER')
    await submitForm()

    expect(discardProductStockMock).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('A quantidade não pode ser maior que o estoque disponível.')
  })

  it('confirma solicitação válida, mostra o resultado e invalida consultas de estoque', async () => {
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    await render()
    fillValidForm()
    await submitForm()
    expect(document.body.textContent).toContain('Confirmar descarte')

    discardProductStockMock.mockResolvedValueOnce(createdDiscard)
    getProductsMock.mockResolvedValueOnce([{ ...products[0], stockQuantity: 3 }, products[1]])
    await clickButton('Confirmar descarte')

    expect(discardProductStockMock).toHaveBeenCalledWith(7, {
      quantity: 2,
      reason: 'DAMAGED',
      observation: 'Pacote violado',
    })
    await waitForText('Descarte #43 registrado')
    expect(toastSuccessMock).toHaveBeenCalledWith('Descarte registrado com sucesso.')
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['products'], exact: true })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['stockMovements'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: DASHBOARD_LOW_STOCK_QUERY_KEY })
  })

  it('apresenta erro da API e mantém a confirmação disponível', async () => {
    discardProductStockMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { message: 'A quantidade a descartar não pode ser maior que o estoque disponível.' } },
    })
    await render()
    fillValidForm()
    await submitForm()
    await clickButton('Confirmar descarte')

    await waitForText('A quantidade a descartar não pode ser maior que o estoque disponível.')
    expect(toastErrorMock).toHaveBeenCalledWith(
      'A quantidade a descartar não pode ser maior que o estoque disponível.',
    )
    expect(document.body.textContent).toContain('Confirmar descarte')
  })

  it('bloqueia solicitações repetidas enquanto o descarte está em andamento', async () => {
    discardProductStockMock.mockReturnValueOnce(new Promise(() => undefined))
    await render()
    fillValidForm()
    await submitForm()

    await act(async () => {
      Array.from(document.body.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Confirmar descarte'))
        ?.click()
      await Promise.resolve()
      Array.from(document.body.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Confirmar descarte'))
        ?.click()
      await Promise.resolve()
    })

    expect(discardProductStockMock).toHaveBeenCalledTimes(1)
  })

  it('permite consultar páginas posteriores do histórico', async () => {
    getStockMovementsMock.mockImplementation(async (filters: { page: number }) => ({
      ...movementPage,
      number: filters.page,
      totalPages: 2,
      first: filters.page === 0,
      last: filters.page === 1,
    }))
    await render()
    await clickButton('Próxima')

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 10))
    })
    expect(getStockMovementsMock).toHaveBeenLastCalledWith({
      movementType: 'DISCARD',
      page: 1,
      size: 20,
    })
  })
})
