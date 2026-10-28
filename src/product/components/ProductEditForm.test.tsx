// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CategoryRecord } from '../../category/services/categoryApi'
import type { ProductRecord, UpdateProductRequest } from '../services/productApi'
import { ProductEditForm } from './ProductEditForm'

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

const product: ProductRecord = {
  id: 5,
  barcode: '7890000000000',
  name: 'Arroz',
  categoryId: 7,
  category: 'Mercearia',
  price: 12.9,
  costPrice: 6.25,
  stockQuantity: 10,
  active: true,
}

async function flush() {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0)
  })
}

async function setFieldValue(selector: string, value: string) {
  const field = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector)

  if (!field) {
    throw new Error(`Field not found: ${selector}`)
  }

  await act(async () => {
    const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
    valueSetter?.call(field, value)
    field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
    await flush()
  })
}

describe('ProductEditForm', () => {
  let container: HTMLDivElement
  let root: Root
  let onSubmit: (payload: UpdateProductRequest) => void

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
          <ProductEditForm
            product={product}
            isSaving={false}
            onSubmit={onSubmit}
            onClose={vi.fn()}
          />
        </QueryClientProvider>,
      )
      await flush()
    })
  }

  async function waitForCategories() {
    for (let index = 0; index < 20; index += 1) {
      if (document.querySelector('#product-edit-category option[value="23"]')) {
        return
      }

      await act(async () => {
        await flush()
      })
    }

    throw new Error('Timed out waiting for category options')
  }

  async function submit() {
    const form = document.querySelector<HTMLFormElement>('#product-edit-form')

    if (!form) {
      throw new Error('Product edit form not found')
    }

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await flush()
    })
  }

  it('shows the current category and preserves its ID when other fields change', async () => {
    getCategoriesMock.mockResolvedValueOnce(categories)
    await render()
    await waitForCategories()

    const categorySelect = document.querySelector<HTMLSelectElement>('#product-edit-category')
    expect(categorySelect?.value).toBe('7')
    expect(categorySelect?.selectedOptions[0]?.textContent).toBe('Mercearia')
    expect(document.querySelector<HTMLInputElement>('[name="costPrice"]')?.value).toBe('6,25')

    await setFieldValue('[name="name"]', 'Arroz integral')
    await setFieldValue('[name="costPrice"]', '8,75')
    await submit()

    expect(onSubmit).toHaveBeenCalledWith({
      barcode: '7890000000000',
      name: 'Arroz integral',
      categoryId: 7,
      price: 12.9,
      costPrice: 8.75,
    })
  })

  it('sends the selected category ID when the category changes', async () => {
    getCategoriesMock.mockResolvedValueOnce(categories)
    await render()
    await waitForCategories()

    await setFieldValue('[name="categoryId"]', '23')
    await submit()

    expect(onSubmit).toHaveBeenCalledWith({
      barcode: '7890000000000',
      name: 'Arroz',
      categoryId: 23,
      price: 12.9,
      costPrice: 6.25,
    })
  })

  it('accepts products without a recorded cost and omits the field when unchanged', async () => {
    const productWithoutCost = { ...product, costPrice: null }
    getCategoriesMock.mockResolvedValueOnce(categories)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ProductEditForm
            product={productWithoutCost}
            isSaving={false}
            onSubmit={onSubmit}
            onClose={vi.fn()}
          />
        </QueryClientProvider>,
      )
      await flush()
    })
    await waitForCategories()

    expect(document.querySelector<HTMLInputElement>('[name="costPrice"]')?.value).toBe('')
    await submit()

    expect(onSubmit).toHaveBeenCalledWith({
      barcode: '7890000000000',
      name: 'Arroz',
      categoryId: 7,
      price: 12.9,
    })
  })

  it('rejects cost values with more than two decimal places', async () => {
    getCategoriesMock.mockResolvedValueOnce(categories)
    await render()
    await waitForCategories()

    await setFieldValue('[name="costPrice"]', '6,255')
    await submit()

    expect(onSubmit).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Informe um preço de custo válido, com até 2 casas decimais.')
  })
})
