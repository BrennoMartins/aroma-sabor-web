// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductRecord } from '../../product/services/productApi'
import { DASHBOARD_LOW_STOCK_QUERY_KEY } from '../../dashboard/hooks/useDashboardProducts'
import { InventoryPage } from './InventoryPage'

const {
  getProductsMock,
  getInactiveProductsMock,
  replenishProductMock,
  adjustProductStockMock,
  getStockMovementsMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  getProductsMock: vi.fn(),
  getInactiveProductsMock: vi.fn(),
  replenishProductMock: vi.fn(),
  adjustProductStockMock: vi.fn(),
  getStockMovementsMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('../../product/services/productApi', () => ({
  getProducts: (...args: unknown[]) => getProductsMock(...args),
  getInactiveProducts: (...args: unknown[]) => getInactiveProductsMock(...args),
  replenishProduct: (...args: unknown[]) => replenishProductMock(...args),
  adjustProductStock: (...args: unknown[]) => adjustProductStockMock(...args),
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
]

const movementPage = {
  content: [
    {
      id: 42,
      productId: 7,
      productName: 'Arroz',
      movementType: 'ENTRY' as const,
      quantity: 5,
      stockAfter: 10,
      createdAt: '2026-10-25T18:30:00',
      reason: 'Nota fiscal 31',
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

function setFieldValue(selector: string, value: string) {
  const field = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector)
  if (!field) {
    throw new Error(`Field not found: ${selector}`)
  }
  act(() => {
    const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(field, value)
    field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
    if (field instanceof HTMLInputElement && field.type === 'date') {
      field.dispatchEvent(new Event('change', { bubbles: true }))
    }
  })
}

describe('InventoryPage', () => {
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
    getInactiveProductsMock.mockReset().mockResolvedValue([])
    replenishProductMock.mockReset()
    adjustProductStockMock.mockReset()
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
          <InventoryPage />
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

  async function submitForm(id: string) {
    await act(async () => {
      document.querySelector<HTMLFormElement>(id)?.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
  }

  async function clickButton(button: HTMLButtonElement | null) {
    await act(async () => {
      button?.click()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
  }

  async function waitForMovementRequest(expected: Record<string, unknown>) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const latestCall = getStockMovementsMock.mock.calls.at(-1)?.[0]
      if (latestCall && Object.entries(expected).every(([key, value]) => latestCall[key] === value)) {
        return
      }
      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 5))
      })
    }
    throw new Error(`Timed out waiting for stock movement filters: ${JSON.stringify(expected)}`)
  }

  it('valida reposição inteira positiva e envia somente após validação', async () => {
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    await render()
    setFieldValue('#replenishment-product', '7')
    setFieldValue('[name="quantity"]', '1.5')
    await submitForm('#inventory-replenishment-form')

    expect(replenishProductMock).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('número inteiro maior que zero')

    setFieldValue('[name="quantity"]', '4')
    setFieldValue('[name="unitCostPrice"]', '8,50')
    setFieldValue('[name="reason"]', 'Recebimento')
    const serverProduct = { ...products[0], stockQuantity: 9 }
    replenishProductMock.mockResolvedValueOnce(serverProduct)
    getProductsMock.mockResolvedValueOnce([serverProduct])
    await submitForm('#inventory-replenishment-form')

    expect(replenishProductMock).toHaveBeenCalledWith(7, {
      quantity: 4,
      unitCostPrice: 8.5,
      reason: 'Recebimento',
    })
    expect(queryClient.getQueryData<ProductRecord[]>(['products'])?.[0].stockQuantity).toBe(9)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: DASHBOARD_LOW_STOCK_QUERY_KEY })
    expect(toastSuccessMock).toHaveBeenCalledWith('Reposição registrada com sucesso.')
  })

  it('exige custo unitário e informa conflito quando o custo atual do estoque é desconhecido', async () => {
    await render()
    setFieldValue('#replenishment-product', '7')
    setFieldValue('[name="quantity"]', '2')
    await submitForm('#inventory-replenishment-form')

    expect(replenishProductMock).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Informe o custo unitário de compra.')

    setFieldValue('[name="unitCostPrice"]', '0')
    replenishProductMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 409,
        data: { message: 'O custo médio do estoque existente não está cadastrado.' },
      },
    })
    await submitForm('#inventory-replenishment-form')

    expect(replenishProductMock).toHaveBeenCalledWith(7, {
      quantity: 2,
      unitCostPrice: 0,
      reason: undefined,
    })
    expect(toastErrorMock).toHaveBeenCalledWith(
      'O custo médio do estoque existente não está cadastrado.',
    )
  })

  it('confirma ajuste com quantidade física zero e atualiza o produto pela resposta', async () => {
    await render()
    setFieldValue('#adjustment-product', '7')
    setFieldValue('[name="quantityOnHand"]', '0')
    setFieldValue('[name="justification"]', 'Contagem física')
    await submitForm('#inventory-adjustment-form')
    await waitForText('saldo final de 0 unidades')

    expect(adjustProductStockMock).not.toHaveBeenCalled()
    const serverProduct = { ...products[0], stockQuantity: 0 }
    adjustProductStockMock.mockResolvedValueOnce(serverProduct)
    getProductsMock.mockResolvedValueOnce([serverProduct])
    await clickButton(Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Confirmar ajuste'),
    ) ?? null)

    expect(adjustProductStockMock).toHaveBeenCalledWith(7, {
      quantityOnHand: 0,
      reason: 'Contagem física',
    })
    expect(queryClient.getQueryData<ProductRecord[]>(['products'])?.[0].stockQuantity).toBe(0)
    expect(toastSuccessMock).toHaveBeenCalledWith('Ajuste de estoque registrado com sucesso.')
    expect(document.body.textContent).not.toContain('saldo final de 0 unidades')
  })

  it('valida justificativa e limite de 255 caracteres antes de solicitar ajuste', async () => {
    await render()
    setFieldValue('#adjustment-product', '7')
    setFieldValue('[name="quantityOnHand"]', '-1')
    setFieldValue('[name="justification"]', '   ')
    await submitForm('#inventory-adjustment-form')

    expect(adjustProductStockMock).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('número inteiro maior ou igual a zero')
    expect(document.body.textContent).toContain('Informe uma justificativa.')

    setFieldValue('[name="quantityOnHand"]', '3')
    setFieldValue('[name="justification"]', 'x'.repeat(256))
    await submitForm('#inventory-adjustment-form')
    expect(adjustProductStockMock).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('no máximo 255 caracteres')
  })

  it('trata ajuste sem diferença como conflito informado ao operador', async () => {
    adjustProductStockMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409 },
    })
    await render()
    setFieldValue('#adjustment-product', '7')
    setFieldValue('[name="quantityOnHand"]', '5')
    setFieldValue('[name="justification"]', 'Conferência')
    await submitForm('#inventory-adjustment-form')
    await clickButton(Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Confirmar ajuste'),
    ) ?? null)

    expect(toastErrorMock).toHaveBeenCalledWith(
      'A quantidade informada já corresponde ao saldo atual. Nenhum ajuste foi realizado.',
    )
    expect(document.body.textContent).toContain('Confirmar ajuste')
  })

  it('filtra no backend e preserva os filtros ao navegar na página', async () => {
    getStockMovementsMock.mockImplementation(async (filters: { page: number }) => ({
      ...movementPage,
      content: filters.page === 1
        ? [{ ...movementPage.content[0], id: 41, reason: 'Página anterior' }]
        : movementPage.content,
      number: filters.page,
      totalPages: 2,
      last: filters.page === 1,
    }))
    await render()

    expect(document.body.textContent).toContain('Nota fiscal 31')
    await clickButton(Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Próxima'),
    ) ?? null)
    await waitForText('Página anterior')
    expect(getStockMovementsMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, size: 20 }))

    setFieldValue('#movement-product-filter', '7')
    setFieldValue('#movement-type-filter', 'ADJUSTMENT')
    setFieldValue('input[name="movement-start-date"]', '2026-10-01')
    setFieldValue('input[name="movement-end-date"]', '2026-10-31')
    await waitForMovementRequest({
      productId: 7,
      movementType: 'ADJUSTMENT',
      startDate: '2026-10-01T00:00:00',
      endDate: '2026-10-31T23:59:59.999999',
      page: 0,
      size: 20,
    })

    expect(getStockMovementsMock).toHaveBeenLastCalledWith({
      productId: 7,
      movementType: 'ADJUSTMENT',
      startDate: '2026-10-01T00:00:00',
      endDate: '2026-10-31T23:59:59.999999',
      page: 0,
      size: 20,
    })
  })

  it('exibe quantidade e saldo após movimentação em colunas distintas', async () => {
    await render()

    expect(container.querySelector('h1')?.textContent).toBe('Gestão de estoque')
    expect(container.textContent).toContain('ENTRADA')
    expect(container.textContent).toContain('CONTAGEM FÍSICA')
    expect(container.querySelector('label[for="unitCostPrice"]')?.textContent)
      .toBe('Custo unitário de compra')

    const historyTable = document.querySelector('table')
    expect(historyTable).not.toBeNull()
    expect(historyTable?.querySelector('th[scope="col"]:nth-child(4)')?.textContent).toBe('Quantidade')
    expect(historyTable?.querySelector('th[scope="col"]:nth-child(5)')?.textContent)
      .toBe('Saldo após movimentação')
    expect(historyTable?.querySelector('tbody tr')?.children[3]?.textContent).toBe('+5')
    expect(historyTable?.querySelector('tbody tr')?.children[4]?.textContent).toBe('10')
  })

  it('mostra Não disponível para saldos nulos ou ausentes sem estimar valores', async () => {
    const { stockAfter: _stockAfter, ...legacyMovement } = movementPage.content[0]
    expect(_stockAfter).toBe(10)
    getStockMovementsMock.mockResolvedValueOnce({
      ...movementPage,
      content: [{ ...movementPage.content[0], stockAfter: null }, { ...legacyMovement, id: 43 }],
      totalElements: 2,
    })
    await render()
    await waitForText('Saldo após movimentação')

    const balanceCells = Array.from(document.querySelectorAll('tbody tr'))
      .map((row) => row.children[4]?.textContent)
    expect(balanceCells).toEqual(['Não disponível', 'Não disponível'])
  })

  it('mostra estado vazio após tentar novamente quando a consulta falha', async () => {
    getStockMovementsMock
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ ...movementPage, content: [], totalElements: 0, totalPages: 0, empty: true })
    await render()
    await waitForText('Não foi possível carregar o histórico de movimentações.')
    await clickButton(Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Tentar novamente'),
    ) ?? null)
    await waitForText('Não há movimentações para os filtros selecionados.')
    expect(getStockMovementsMock).toHaveBeenCalledTimes(2)
  })

  it('impede reposições duplicadas durante o envio', async () => {
    replenishProductMock.mockReturnValueOnce(new Promise(() => undefined))
    await render()
    setFieldValue('#replenishment-product', '7')
    setFieldValue('[name="quantity"]', '2')
    setFieldValue('[name="unitCostPrice"]', '8,50')

    await act(async () => {
      document.querySelector<HTMLFormElement>('#inventory-replenishment-form')?.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
      document.querySelector<HTMLFormElement>('#inventory-replenishment-form')?.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
      await Promise.resolve()
    })

    expect(replenishProductMock).toHaveBeenCalledTimes(1)
    expect(Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Registrar reposição'),
    )?.disabled).toBe(true)
  })
})
