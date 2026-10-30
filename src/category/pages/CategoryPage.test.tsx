// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CategoryRecord } from '../services/categoryApi'
import { CategoryPage } from './CategoryPage'

const { createCategoryMock, getCategoriesMock } = vi.hoisted(() => ({
  createCategoryMock: vi.fn(),
  getCategoriesMock: vi.fn(),
}))

vi.mock('../services/categoryApi', () => ({
  createCategory: (...args: unknown[]) => createCategoryMock(...args),
  getCategories: (...args: unknown[]) => getCategoriesMock(...args),
}))

const category: CategoryRecord = {
  id: 17,
  name: 'Mercearia',
  createdAt: '2026-10-25T16:10:22.410136',
}

async function flush() {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0)
  })
}

async function setName(value: string) {
  const field = document.querySelector<HTMLInputElement>('[name="name"]')

  if (!field) {
    throw new Error('Category name field not found')
  }

  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    valueSetter?.call(field, value)
    field.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()
  })
}

async function submit() {
  const form = document.querySelector<HTMLFormElement>('form')

  if (!form) {
    throw new Error('Category form not found')
  }

  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flush()
  })
}

describe('CategoryPage', () => {
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
    createCategoryMock.mockReset()
    getCategoriesMock.mockReset()
  })

  afterEach(() => {
    root.unmount()
    queryClient.clear()
    container.remove()
    document.body.innerHTML = ''
  })

  async function render() {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <CategoryPage />
        </QueryClientProvider>,
      )
      await flush()
    })
  }

  async function waitForText(selector: string, expectedText: string) {
    for (let index = 0; index < 20; index += 1) {
      if (document.querySelector(selector)?.textContent?.includes(expectedText)) {
        return
      }

      await act(async () => {
        await flush()
      })
    }

    throw new Error(`Timed out waiting for ${selector} to contain ${expectedText}`)
  }

  it('shows loading while categories are being fetched', async () => {
    getCategoriesMock.mockReturnValueOnce(new Promise(() => {}))
    await render()

    expect(document.body.textContent).toContain('Carregando categorias...')
  })

  it('shows the returned categories and a clear empty state', async () => {
    getCategoriesMock.mockResolvedValueOnce([category])
    await render()
    await waitForText('ul', 'Mercearia')
    expect(document.querySelector('h1')?.textContent).toBe('Categorias')
    expect(document.body.textContent).toContain('1 categoria')
    expect(document.querySelector('ul')?.textContent).toContain('Mercearia')
    expect(document.querySelector<HTMLInputElement>('[name="name"]')?.placeholder).toBe('Ex.: Mercearia')

    root.unmount()
    root = createRoot(container)
    queryClient.clear()
    getCategoriesMock.mockResolvedValueOnce([])
    await render()
    await waitForText('[role="status"]', 'Nenhuma categoria cadastrada.')
    expect(document.body.textContent).toContain('0 categorias')
  })

  it('shows errors and retries loading categories', async () => {
    getCategoriesMock.mockRejectedValueOnce(new Error('Request failed')).mockResolvedValueOnce([category])
    await render()
    await waitForText('[role="alert"]', 'Não foi possível carregar as categorias.')

    const retryButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Tentar novamente'),
    )
    expect(retryButton).toBeDefined()

    await act(async () => {
      retryButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flush()
    })
    await waitForText('ul', 'Mercearia')
    expect(getCategoriesMock).toHaveBeenCalledTimes(2)
  })

  it('creates a trimmed category and refreshes the category query', async () => {
    getCategoriesMock.mockResolvedValueOnce([]).mockResolvedValueOnce([category])
    createCategoryMock.mockResolvedValueOnce(category)
    await render()
    await setName('  Mercearia  ')
    await submit()

    await waitForText('[role="status"]', 'Categoria "Mercearia" cadastrada com sucesso.')
    expect(createCategoryMock.mock.calls[0]?.[0]).toEqual({ name: 'Mercearia' })
    expect(getCategoriesMock).toHaveBeenCalledTimes(2)
    expect(document.querySelector('ul')?.textContent).toContain('Mercearia')
    expect(document.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe('')
  })

  it('validates empty and oversized names before sending', async () => {
    getCategoriesMock.mockResolvedValueOnce([])
    await render()

    await submit()
    expect(document.body.textContent).toContain('Informe o nome da categoria.')
    expect(createCategoryMock).not.toHaveBeenCalled()

    await setName('a'.repeat(101))
    await submit()
    expect(document.body.textContent).toContain('Use no máximo 100 caracteres.')
    expect(createCategoryMock).not.toHaveBeenCalled()
  })

  it('prevents duplicate submissions while the request is pending', async () => {
    getCategoriesMock.mockResolvedValueOnce([])
    let resolveCreate: (createdCategory: CategoryRecord) => void = () => undefined
    createCategoryMock.mockReturnValueOnce(
      new Promise<CategoryRecord>((resolve) => {
        resolveCreate = resolve
      }),
    )
    await render()
    await setName('Mercearia')
    await submit()

    expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true)
    await submit()
    expect(createCategoryMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveCreate(category)
      await flush()
    })
    await waitForText('[role="status"]', 'Categoria "Mercearia" cadastrada com sucesso.')
  })

  it('explains a duplicate-category response from the API', async () => {
    getCategoriesMock.mockResolvedValueOnce([])
    createCategoryMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409 },
    })
    await render()
    await setName('Mercearia')
    await submit()

    await waitForText('[role="alert"]', 'Já existe uma categoria com esse nome.')
  })
})
