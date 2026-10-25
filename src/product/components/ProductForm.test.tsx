// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CategoryRecord } from '../../category/services/categoryApi'
import { ProductForm } from './ProductForm'
import type { CreateProductRequest } from '../services/productApi'

const { getCategoriesMock } = vi.hoisted(() => ({
  getCategoriesMock: vi.fn(),
}))

vi.mock('../../category/services/categoryApi', () => ({
  getCategories: (...args: unknown[]) => getCategoriesMock(...args),
}))

const categories: CategoryRecord[] = [
  { id: 7, name: 'Mercearia', createdAt: '2026-10-25T16:10:22.410136' },
  { id: 23, name: 'Bebidas', createdAt: '2026-10-25T16:10:22.410136' },
]

async function flush() {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0)
  })
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

describe('ProductForm', () => {
  let container: HTMLDivElement
  let root: Root
  let onSubmit: (payload: CreateProductRequest) => void

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    onSubmit = vi.fn()
    getCategoriesMock.mockReset()
  })

  afterEach(() => {
    root.unmount()
    container.remove()
    document.body.innerHTML = ''
  })

  async function render() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ProductForm
            open
            barcode="7908552008891"
            isSaving={false}
            onSubmit={onSubmit}
            onClose={vi.fn()}
          />
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

  async function submit() {
    const form = document.querySelector<HTMLFormElement>('#smart-product-form')

    if (!form) {
      throw new Error('Product form not found')
    }

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await flush()
    })
  }

  it('exibe nomes e IDs das categorias retornadas pela API', async () => {
    getCategoriesMock.mockResolvedValueOnce(categories)
    await render()
    await waitForText('#categoryId option[value="23"]', 'Bebidas')

    const options = Array.from(document.querySelectorAll<HTMLSelectElement>('#categoryId option'))
      .filter((option) => option.value)
      .map((option) => ({ id: option.value, name: option.textContent }))

    expect(options).toEqual([
      { id: '7', name: 'Mercearia' },
      { id: '23', name: 'Bebidas' },
    ])
  })

  it('envia o ID selecionado em categoryId junto com o DTO real', async () => {
    getCategoriesMock.mockResolvedValueOnce(categories)
    await render()
    await waitForText('#categoryId option[value="23"]', 'Bebidas')

    setFieldValue('[name="name"]', 'Orbit')
    setFieldValue('[name="categoryId"]', '23')
    setFieldValue('[name="price"]', '20')
    await submit()

    expect(onSubmit).toHaveBeenCalledWith({
      barcode: '7908552008891',
      name: 'Orbit',
      categoryId: 23,
      price: 20,
      stock: 0,
    })
  })

  it('bloqueia o envio sem uma categoria selecionada', async () => {
    getCategoriesMock.mockResolvedValueOnce(categories)
    await render()
    await waitForText('#categoryId option[value="7"]', 'Mercearia')

    setFieldValue('[name="name"]', 'Orbit')
    setFieldValue('[name="price"]', '20')
    await submit()

    expect(onSubmit).not.toHaveBeenCalled()
    expect(document.querySelector('#categoryId-error')?.textContent).toContain('Selecione uma categoria.')
  })

  it('desabilita o select e o salvamento durante o carregamento', async () => {
    getCategoriesMock.mockReturnValueOnce(new Promise(() => {}))
    await render()

    expect(document.querySelector<HTMLSelectElement>('#categoryId')?.disabled).toBe(true)
    expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true)
    expect(document.body.textContent).toContain('Carregando categorias...')
  })

  it('mostra erro e permite tentar novamente', async () => {
    getCategoriesMock.mockRejectedValueOnce(new Error('Request failed')).mockResolvedValueOnce(categories)
    await render()
    await waitForText('[role="alert"]', 'Nao foi possivel carregar as categorias')

    const retryButton = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Tentar novamente'),
    )
    expect(retryButton).toBeDefined()

    await act(async () => {
      retryButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flush()
    })

    await waitForText('#categoryId option[value="7"]', 'Mercearia')
    expect(getCategoriesMock).toHaveBeenCalledTimes(2)
  })

  it('informa quando a API nao retorna categorias', async () => {
    getCategoriesMock.mockResolvedValueOnce([])
    await render()
    await waitForText('[role="status"]', 'Nenhuma categoria cadastrada')

    expect(document.querySelector<HTMLSelectElement>('#categoryId')?.disabled).toBe(true)
    expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true)
  })
})
