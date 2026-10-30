// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DASHBOARD_LOW_STOCK_QUERY_KEY,
  DASHBOARD_TOP_PRODUCTS_QUERY_KEY,
} from '../../dashboard/hooks/useDashboardProducts'
import { useSmartProductRegistration } from './useSmartProductRegistration'
import { PRODUCTS_QUERY_KEY } from './useProducts'

const {
  createProductMock,
  getProductByBarcodeMock,
  toastErrorMock,
  toastInfoMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  createProductMock: vi.fn(),
  getProductByBarcodeMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastInfoMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

vi.mock('../services/productApi', () => ({
  createProduct: (...args: unknown[]) => createProductMock(...args),
  getProductByBarcode: (...args: unknown[]) => getProductByBarcodeMock(...args),
}))

vi.mock('../../shared/components/Toast/toast-store', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    info: (...args: unknown[]) => toastInfoMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}))

const existingProduct = {
  id: 8,
  name: 'Produto existente',
  barcode: '789000000001',
  categoryId: 1,
  category: 'Mercearia',
  price: 5,
  costPrice: null,
  stockQuantity: 2,
  active: true,
}

function RegistrationHarness() {
  const {
    activeModal,
    isCheckingProduct,
    processScannedBarcode,
    registrationBarcode,
    selectedProduct,
    submitNewProduct,
    closeAllModals,
  } = useSmartProductRegistration()

  return (
    <>
      <input aria-label="Código recebido" defaultValue="789000000001" />
      <button
        type="button"
        onClick={() => processScannedBarcode(
          document.querySelector<HTMLInputElement>('[aria-label="Código recebido"]')?.value ?? '',
        )}
      >
        Processar leitura
      </button>
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
      <button type="button" onClick={closeAllModals}>Fechar modal</button>
      <output data-testid="registration-state">
        {`${activeModal}|${registrationBarcode ?? ''}|${selectedProduct?.id ?? ''}|${isCheckingProduct}`}
      </output>
    </>
  )
}

function httpError(status: number) {
  const error = new AxiosError(`HTTP ${status}`)
  error.response = {
    data: null,
    status,
    statusText: status === 404 ? 'Not Found' : 'Error',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  }
  return error
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
    getProductByBarcodeMock.mockReset()
    toastErrorMock.mockReset()
    toastInfoMock.mockReset()
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
      Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Cadastrar'),
      )?.click()
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
      Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Cadastrar'),
      )?.click()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    expect(toastErrorMock).toHaveBeenCalledWith('Nao foi possivel salvar o produto.')
    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it('abre reposição quando a leitura encontra um produto', async () => {
    getProductByBarcodeMock.mockResolvedValueOnce(existingProduct)
    await render()

    await act(async () => {
      Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Processar leitura'),
      )?.click()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    expect(getProductByBarcodeMock).toHaveBeenCalledTimes(1)
    expect(getProductByBarcodeMock).toHaveBeenCalledWith('789000000001')
    expect(container.querySelector('[data-testid="registration-state"]')?.textContent)
      .toBe('restock||8|false')
    expect(toastInfoMock).toHaveBeenCalledWith(
      'Produto encontrado. A reposição ficará disponível quando o backend oferecer essa operação.',
    )
  })

  it('abre o cadastro com o código quando a leitura recebe HTTP 404', async () => {
    getProductByBarcodeMock.mockRejectedValueOnce(httpError(404))
    await render()

    await act(async () => {
      Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Processar leitura'),
      )?.click()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    expect(container.querySelector('[data-testid="registration-state"]')?.textContent)
      .toBe('register|789000000001||false')
    expect(toastInfoMock).toHaveBeenCalledWith('Produto novo detectado. Complete o cadastro.')
  })

  it('não abre modais para erros diferentes de 404', async () => {
    getProductByBarcodeMock.mockRejectedValueOnce(httpError(503))
    await render()

    await act(async () => {
      Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Processar leitura'),
      )?.click()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    expect(container.querySelector('[data-testid="registration-state"]')?.textContent)
      .toBe('none|||false')
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Nao foi possivel consultar o produto pelo codigo de barras.',
    )
  })

  it('ignora código vazio sem consultar a API', async () => {
    await render()
    const barcodeField = container.querySelector<HTMLInputElement>('[aria-label="Código recebido"]')
    if (!barcodeField) {
      throw new Error('Barcode field not found')
    }

    await act(async () => {
      barcodeField.value = '   '
      Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Processar leitura'),
      )?.click()
    })

    expect(getProductByBarcodeMock).not.toHaveBeenCalled()
  })

  it('ignora leituras repetidas enquanto consulta e enquanto o modal está aberto', async () => {
    let resolveLookup: ((product: typeof existingProduct) => void) | undefined
    getProductByBarcodeMock.mockImplementation(() =>
      new Promise((resolve) => {
        resolveLookup = resolve
      }),
    )
    await render()
    const scanButton = () => Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Processar leitura'),
    )

    await act(async () => {
      scanButton()?.click()
      await Promise.resolve()
    })
    await act(async () => {
      scanButton()?.click()
      await Promise.resolve()
    })
    expect(getProductByBarcodeMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveLookup?.(existingProduct)
      await Promise.resolve()
    })
    await act(async () => {
      scanButton()?.click()
      await Promise.resolve()
    })
    expect(getProductByBarcodeMock).toHaveBeenCalledTimes(1)
  })

  it('permite nova leitura depois de fechar o modal e produto inativo continua no fluxo existente', async () => {
    getProductByBarcodeMock
      .mockResolvedValueOnce({ ...existingProduct, active: false })
      .mockResolvedValueOnce(existingProduct)
    await render()
    const buttons = () => Array.from(container.querySelectorAll('button'))
    const scanButton = () => buttons().find((button) => button.textContent?.includes('Processar leitura'))
    const closeButton = () => buttons().find((button) => button.textContent?.includes('Fechar modal'))

    await act(async () => {
      scanButton()?.click()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    expect(container.querySelector('[data-testid="registration-state"]')?.textContent)
      .toBe('restock||8|false')

    await act(async () => {
      closeButton()?.click()
    })
    await act(async () => {
      scanButton()?.click()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    expect(getProductByBarcodeMock).toHaveBeenCalledTimes(2)
    expect(container.querySelector('[data-testid="registration-state"]')?.textContent)
      .toBe('restock||8|false')
  })
})
