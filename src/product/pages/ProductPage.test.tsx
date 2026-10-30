// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BarcodeScannerProvider } from '../../scanner/BarcodeScannerProvider'
import type { CategoryRecord } from '../../category/services/categoryApi'
import { ProductPage } from './ProductPage'

const {
  getCategoriesMock,
  createCategoryMock,
  getProductByBarcodeMock,
  productListRenderMock,
} = vi.hoisted(() => ({
  getCategoriesMock: vi.fn(),
  createCategoryMock: vi.fn(),
  getProductByBarcodeMock: vi.fn(),
  productListRenderMock: vi.fn(),
}))

vi.mock('../../category/services/categoryApi', () => ({
  getCategories: (...args: unknown[]) => getCategoriesMock(...args),
  createCategory: (...args: unknown[]) => createCategoryMock(...args),
}))

vi.mock('../services/productApi', () => ({
  createProduct: vi.fn(),
  getProductByBarcode: (...args: unknown[]) => getProductByBarcodeMock(...args),
}))

vi.mock('../components/ProductList', () => ({
  ProductList: (props: {
    onScannerRead?: (barcode: string) => void
    scannerEnabled?: boolean
  }) => {
    productListRenderMock(props)
    return <div data-testid="product-list">Existing product list</div>
  },
}))

const category: CategoryRecord = {
  id: 17,
  name: 'Mercearia',
  createdAt: '2026-10-25T16:10:22.410136',
}

function LocationDisplay() {
  const location = useLocation()
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>
}

async function flush() {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0)
  })
}

async function waitForText(text: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (document.body.textContent?.includes(text)) {
      return
    }

    await act(async () => {
      await flush()
    })
  }

  throw new Error(`Timed out waiting for text: ${text}`)
}

describe('ProductPage tabs', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient
  let router: ReturnType<typeof createMemoryRouter>

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })
    getCategoriesMock.mockReset().mockResolvedValue([category])
    createCategoryMock.mockReset()
    getProductByBarcodeMock.mockReset()
    productListRenderMock.mockClear()
  })

  afterEach(() => {
    act(() => root.unmount())
    queryClient.clear()
    container.remove()
    document.body.innerHTML = ''
  })

  async function render(initialEntry: string) {
    router = createMemoryRouter(
      [
        {
          path: '*',
          element: (
            <>
              <ProductPage />
              <LocationDisplay />
            </>
          ),
        },
      ],
      { initialEntries: [initialEntry] },
    )

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <BarcodeScannerProvider>
            <RouterProvider router={router} />
          </BarcodeScannerProvider>
        </QueryClientProvider>,
      )
      await flush()
    })
  }

  async function clickTab(id: string) {
    const tab = container.querySelector<HTMLButtonElement>(`#${id}`)

    if (!tab) {
      throw new Error(`Tab not found: ${id}`)
    }

    await act(async () => {
      tab.click()
      await flush()
    })
  }

  it('opens the Products tab by default and preserves the existing product view', async () => {
    await render('/products')

    expect(container.querySelector('#products-tab')?.getAttribute('aria-selected')).toBe('true')
    expect(container.querySelector('#products-panel')?.hasAttribute('hidden')).toBe(false)
    expect(container.querySelector('#categories-panel')?.hasAttribute('hidden')).toBe(true)
    expect(container.textContent).toContain('Existing product list')
    expect(container.textContent).not.toContain('Cadastro inteligente de produtos')
    expect(container.textContent).not.toContain('Fluxo de leitura')
    expect(container.textContent).not.toContain('Aguardando leitura')
    expect(container.textContent).not.toContain('Buscar produto')
    expect(productListRenderMock.mock.lastCall?.[0].scannerEnabled).toBe(true)
  })

  it('encaminha uma leitura da busca ao fluxo inteligente uma única vez', async () => {
    getProductByBarcodeMock.mockResolvedValue({
      id: 8,
      name: 'Produto existente',
      barcode: '789000000001',
      category: { id: 17, name: 'Mercearia' },
      price: 5,
      costPrice: null,
      stock: 2,
      active: true,
    })
    await render('/products')

    await act(async () => {
      productListRenderMock.mock.lastCall?.[0].onScannerRead?.('789000000001')
      await flush()
    })

    expect(getProductByBarcodeMock).toHaveBeenCalledTimes(1)
    expect(getProductByBarcodeMock).toHaveBeenCalledWith('789000000001')
  })

  it('opens Categories from the query string and retains its current management interface', async () => {
    await render('/products?tab=categories')
    await waitForText('Mercearia')

    expect(container.querySelector('#categories-tab')?.getAttribute('aria-selected')).toBe('true')
    expect(container.querySelector('#categories-panel')?.hasAttribute('hidden')).toBe(false)
    expect(container.textContent).toContain('Cadastrar categoria')
    expect(container.textContent).toContain('Mercearia')
  })

  it('updates the URL when switching between tabs', async () => {
    await render('/products?filter=existing')

    await clickTab('categories-tab')
    expect(router.state.location.pathname + router.state.location.search).toBe('/products?filter=existing&tab=categories')

    await clickTab('products-tab')
    expect(router.state.location.pathname + router.state.location.search).toBe('/products?filter=existing')
  })

  it('restores the selected tab with browser back and forward navigation', async () => {
    await render('/products')

    await clickTab('categories-tab')
    await clickTab('products-tab')

    await act(async () => {
      await router.navigate(-1)
      await flush()
    })
    expect(container.querySelector('#categories-tab')?.getAttribute('aria-selected')).toBe('true')

    await act(async () => {
      await router.navigate(1)
      await flush()
    })
    expect(container.querySelector('#products-tab')?.getAttribute('aria-selected')).toBe('true')
  })

  it('uses arrow keys to move focus and activate tabs', async () => {
    await render('/products')
    const productsTab = container.querySelector<HTMLButtonElement>('#products-tab')

    await act(async () => {
      productsTab?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
      await flush()
    })

    expect(document.activeElement).toBe(container.querySelector('#categories-tab'))
    expect(container.querySelector('#categories-tab')?.getAttribute('aria-selected')).toBe('true')
    expect(router.state.location.search).toBe('?tab=categories')
  })

  it('falls back to Products and removes an invalid tab parameter', async () => {
    await render('/products?tab=invalid&keep=yes')

    expect(container.querySelector('#products-tab')?.getAttribute('aria-selected')).toBe('true')
    expect(router.state.location.pathname + router.state.location.search).toBe('/products?keep=yes')
  })
})
