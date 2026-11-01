// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  INACTIVE_PRODUCTS_QUERY_KEY,
  PRODUCT_CATALOG_QUERY_KEY,
  PRODUCTS_QUERY_KEY,
} from '../../product/hooks/useProducts'
import type { CategoryRecord } from '../services/categoryApi'
import { CategoryPage } from './CategoryPage'

const { createCategoryMock, deleteCategoryMock, getCategoriesMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  createCategoryMock: vi.fn(),
  deleteCategoryMock: vi.fn(),
  getCategoriesMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

vi.mock('../services/categoryApi', () => ({
  createCategory: (...args: unknown[]) => createCategoryMock(...args),
  deleteCategory: (...args: unknown[]) => deleteCategoryMock(...args),
  getCategories: (...args: unknown[]) => getCategoriesMock(...args),
}))

vi.mock('../../shared/components/Toast/toast-store', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
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
    deleteCategoryMock.mockReset()
    getCategoriesMock.mockReset()
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
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

  async function clickButton(button: HTMLButtonElement | null) {
    if (!button) {
      throw new Error('Button not found')
    }

    await act(async () => {
      button.click()
      await flush()
    })
  }

  function getDialogButton(label: string) {
    const dialog = document.querySelector('[role="dialog"]')

    return Array.from(dialog?.querySelectorAll('button') ?? [])
      .find((button) => button.textContent?.includes(label)) ?? null
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

  it('offers delete and opens a confirmation naming the category', async () => {
    getCategoriesMock.mockResolvedValueOnce([category])
    await render()
    await waitForText('ul', 'Mercearia')

    const deleteAction = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Excluir',
    )
    expect(deleteAction).toBeDefined()
    await clickButton(deleteAction ?? null)

    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      'Deseja excluir a categoria "Mercearia"? Categorias com produtos vinculados não podem ser excluídas.',
    )
    expect(deleteCategoryMock).not.toHaveBeenCalled()
  })

  it('cancels category deletion without calling the API', async () => {
    getCategoriesMock.mockResolvedValueOnce([category])
    await render()
    await waitForText('ul', 'Mercearia')
    await clickButton(Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Excluir',
    ) ?? null)
    await clickButton(getDialogButton('Cancelar'))

    expect(deleteCategoryMock).not.toHaveBeenCalled()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('deletes the category and invalidates category and product queries', async () => {
    let currentCategories = [category]
    getCategoriesMock.mockImplementation(async () => currentCategories)
    deleteCategoryMock.mockImplementationOnce(async () => {
      currentCategories = []
    })
    await render()
    await waitForText('ul', 'Mercearia')
    queryClient.setQueryData(PRODUCTS_QUERY_KEY, [])
    queryClient.setQueryData([...PRODUCT_CATALOG_QUERY_KEY, { search: '', active: true, page: 0, size: 20 }], {})
    queryClient.setQueryData(INACTIVE_PRODUCTS_QUERY_KEY, [])
    queryClient.setQueryData(['unrelated', 'query'], {})
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    await clickButton(Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Excluir',
    ) ?? null)
    await clickButton(getDialogButton('Excluir'))
    await waitForText('[role="status"]', 'Nenhuma categoria cadastrada.')

    expect(deleteCategoryMock.mock.calls[0]?.[0]).toBe(category.id)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['categories'], exact: true })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: PRODUCTS_QUERY_KEY })
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ['unrelated', 'query'] })
    expect(queryClient.getQueryState(PRODUCTS_QUERY_KEY)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(INACTIVE_PRODUCTS_QUERY_KEY)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['unrelated', 'query'])?.isInvalidated).toBe(false)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(toastSuccessMock).toHaveBeenCalledWith('Categoria "Mercearia" excluída com sucesso.')
  })

  it('shows pending state and prevents duplicate delete requests', async () => {
    getCategoriesMock.mockResolvedValueOnce([category])
    let resolveDelete: () => void = () => undefined
    deleteCategoryMock.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveDelete = resolve
    }))
    await render()
    await waitForText('ul', 'Mercearia')
    await clickButton(Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Excluir',
    ) ?? null)

    await clickButton(getDialogButton('Excluir'))
    expect(getDialogButton('Excluindo...')?.disabled).toBe(true)
    expect(deleteCategoryMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveDelete()
      await flush()
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('shows the domain conflict message and preserves the category', async () => {
    getCategoriesMock.mockResolvedValueOnce([category])
    deleteCategoryMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 409,
        data: { message: 'Esta categoria possui produtos vinculados e não pode ser excluída.' },
      },
    })
    await render()
    await waitForText('ul', 'Mercearia')
    await clickButton(Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Excluir',
    ) ?? null)
    await clickButton(getDialogButton('Excluir'))

    expect(toastErrorMock).toHaveBeenCalledWith('Esta categoria possui produtos vinculados e não pode ser excluída.')
    expect(container.querySelector('ul')?.textContent).toContain('Mercearia')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  })

  it('informs when a category is missing and refreshes the list', async () => {
    let currentCategories = [category]
    getCategoriesMock.mockImplementation(async () => currentCategories)
    deleteCategoryMock.mockImplementationOnce(async () => {
      currentCategories = []
      throw {
        isAxiosError: true,
        response: { status: 404 },
      }
    })
    await render()
    await waitForText('ul', 'Mercearia')
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    await clickButton(Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Excluir',
    ) ?? null)
    await clickButton(getDialogButton('Excluir'))
    await waitForText('[role="status"]', 'Nenhuma categoria cadastrada.')

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Esta categoria não está mais disponível. A lista foi atualizada.',
    )
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['categories'], exact: true })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('allows retrying after an unexpected delete error', async () => {
    let currentCategories = [category]
    getCategoriesMock.mockImplementation(async () => currentCategories)
    deleteCategoryMock
      .mockRejectedValueOnce(new Error('Network failed'))
      .mockImplementationOnce(async () => {
        currentCategories = []
      })
    await render()
    await waitForText('ul', 'Mercearia')
    await clickButton(Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Excluir',
    ) ?? null)
    await clickButton(getDialogButton('Excluir'))

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Não foi possível excluir a categoria. Verifique a conexão e tente novamente.',
    )
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(container.querySelector('ul')?.textContent).toContain('Mercearia')

    await clickButton(getDialogButton('Excluir'))
    expect(deleteCategoryMock).toHaveBeenCalledTimes(2)
    await waitForText('[role="status"]', 'Nenhuma categoria cadastrada.')
  })
})
