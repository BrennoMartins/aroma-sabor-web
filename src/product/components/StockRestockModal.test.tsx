// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductRecord } from '../services/productApi'
import { StockRestockModal } from './StockRestockModal'

const { replenishProductMock, adjustProductStockMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  replenishProductMock: vi.fn(),
  adjustProductStockMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('../services/productApi', () => ({
  replenishProduct: (...args: unknown[]) => replenishProductMock(...args),
  adjustProductStock: (...args: unknown[]) => adjustProductStockMock(...args),
}))

vi.mock('../../shared/components/Toast/toast-store', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}))

const product: ProductRecord = {
  id: 1,
  name: 'Café especial',
  barcode: '7891000000001',
  categoryId: 7,
  category: 'Mercearia',
  price: 18.5,
  stockQuantity: 12,
  active: true,
}

function setFieldValue(selector: string, value: string) {
  const field = document.querySelector<HTMLInputElement>(selector)
  if (!field) {
    throw new Error(`Field not found: ${selector}`)
  }
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(field, value)
  field.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('StockRestockModal', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    replenishProductMock.mockReset()
    adjustProductStockMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
  })

  afterEach(() => {
    act(() => root.unmount())
    queryClient.clear()
    container.remove()
    document.body.innerHTML = ''
  })

  async function render(onClose = vi.fn()) {
    queryClient.setQueryData<ProductRecord[]>(['products'], [product])
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <StockRestockModal open product={product} onClose={onClose} />
        </QueryClientProvider>,
      )
    })
    return onClose
  }

  async function submit() {
    await act(async () => {
      document.querySelector<HTMLFormElement>('#product-restock-form')?.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
  }

  it('exibe o saldo atual e valida quantidade positiva e inteira', async () => {
    await render()

    expect(document.body.textContent).toContain('Estoque atual')
    expect(document.body.textContent).toContain('12')
    expect(document.querySelector('input[name="quantity"]')).not.toBeNull()

    setFieldValue('[name="quantity"]', '1.5')
    await submit()

    expect(replenishProductMock).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('número inteiro maior que zero')
  })

  it('envia a reposição com resposta confirmada pelo backend e atualiza o saldo em cache', async () => {
    const onClose = vi.fn()
    const serverProduct = { ...product, stockQuantity: 17 }
    replenishProductMock.mockResolvedValueOnce(serverProduct)
    await render(onClose)
    setFieldValue('[name="quantity"]', '5')
    setFieldValue('[name="reason"]', 'Nota fiscal 31')

    await submit()

    expect(replenishProductMock).toHaveBeenCalledWith(1, { quantity: 5, reason: 'Nota fiscal 31' })
    expect(queryClient.getQueryData<ProductRecord[]>(['products'])).toEqual([serverProduct])
    expect(toastSuccessMock).toHaveBeenCalledWith('Reposição registrada com sucesso.')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('não envia duas reposições enquanto a primeira está pendente', async () => {
    replenishProductMock.mockReturnValueOnce(new Promise(() => undefined))
    await render()
    setFieldValue('[name="quantity"]', '5')

    await act(async () => {
      document.querySelector<HTMLFormElement>('#product-restock-form')?.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
      document.querySelector<HTMLFormElement>('#product-restock-form')?.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
      await Promise.resolve()
    })

    expect(replenishProductMock).toHaveBeenCalledTimes(1)
    expect(document.querySelector<HTMLButtonElement>('button[form="product-restock-form"]')?.disabled).toBe(true)
  })
})
