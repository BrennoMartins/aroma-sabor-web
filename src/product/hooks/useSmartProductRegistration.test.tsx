// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DASHBOARD_LOW_STOCK_QUERY_KEY,
  DASHBOARD_TOP_PRODUCTS_QUERY_KEY,
} from '../../dashboard/hooks/useDashboardProducts'
import { useSmartProductRegistration } from './useSmartProductRegistration'
import { PRODUCTS_QUERY_KEY } from './useProducts'

const { createProductMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  createProductMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

vi.mock('../../scanner/useBarcodeScanner', () => ({
  useBarcodeScanner: () => ({ onScan: () => () => undefined }),
}))

vi.mock('../services/productApi', () => ({
  createProduct: (...args: unknown[]) => createProductMock(...args),
  getProductByBarcode: vi.fn(),
}))

vi.mock('../../shared/components/Toast/toast-store', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
    info: vi.fn(),
  },
}))

function RegistrationHarness() {
  const { submitNewProduct } = useSmartProductRegistration()

  return (
    <button
      type="button"
      onClick={() => submitNewProduct({
        barcode: '789000000001',
        name: 'Produto novo',
        categoryId: 1,
        price: 5,
        stock: 2,
      })}
    >
      Cadastrar
    </button>
  )
}

describe('useSmartProductRegistration', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    createProductMock.mockReset()
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
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
          <RegistrationHarness />
        </QueryClientProvider>,
      )
    })
  }

  it('invalidates products and low-stock data after successful creation only', async () => {
    createProductMock.mockResolvedValueOnce({ id: 8, name: 'Produto novo' })
    await render()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      container.querySelector('button')?.click()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    expect(toastSuccessMock).toHaveBeenCalledWith('Produto novo cadastrado com sucesso.')
    expect(invalidateQueries).toHaveBeenCalledTimes(2)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: PRODUCTS_QUERY_KEY })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: DASHBOARD_LOW_STOCK_QUERY_KEY })
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: DASHBOARD_TOP_PRODUCTS_QUERY_KEY })
  })

  it('does not invalidate success queries when creation fails', async () => {
    createProductMock.mockRejectedValueOnce(new Error('request failed'))
    await render()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      container.querySelector('button')?.click()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    expect(toastErrorMock).toHaveBeenCalledWith('Nao foi possivel salvar o produto.')
    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
  })
})
