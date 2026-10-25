// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CategoryRecord } from '../../category/services/categoryApi'
import type { ProductRecord } from '../services/productApi'
import { ProductList } from './ProductList'

const {
  getCategoriesMock,
  getProductsMock,
  updateProductMock,
  deactivateProductMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  getCategoriesMock: vi.fn(),
  getProductsMock: vi.fn(),
  updateProductMock: vi.fn(),
  deactivateProductMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

vi.mock('../../category/services/categoryApi', () => ({
  getCategories: (...args: unknown[]) => getCategoriesMock(...args),
}))

vi.mock('../services/productApi', () => ({
  getProducts: (...args: unknown[]) => getProductsMock(...args),
  updateProduct: (...args: unknown[]) => updateProductMock(...args),
  deactivateProduct: (...args: unknown[]) => deactivateProductMock(...args),
}))

vi.mock('../../shared/components/Toast/toast-store', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}))

const categories: CategoryRecord[] = [
  { id: 7, name: 'Mercearia', createdAt: '2026-10-25T16:10:22.410136' },
  { id: 23, name: 'Bebidas', createdAt: '2026-10-25T16:10:22.410136' },
]

const products: ProductRecord[] = [
  {
    id: 1,
    name: 'Café especial',
    barcode: '7891000000001',
    categoryId: 7,
    category: 'Mercearia',
    price: 18.5,
    stockQuantity: 12,
    active: true,
  },
  {
    id: 2,
    name: 'Café gelado',
    barcode: '7892000000002',
    categoryId: 23,
    category: 'Bebidas',
    price: 9.9,
    stockQuantity: 4,
    active: true,
  },
  {
    id: 3,
    name: 'Água mineral',
    barcode: '7893000000003',
    categoryId: 23,
    category: 'Bebidas',
    price: 3.5,
    stockQuantity: 20,
    active: true,
  },
]

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

describe('ProductList', () => {
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
        queries: { retry: false, gcTime: 0 },
      },
    })
    getCategoriesMock.mockReset()
    getProductsMock.mockReset()
    updateProductMock.mockReset()
    deactivateProductMock.mockReset()
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
    getCategoriesMock.mockResolvedValue(categories)
    getProductsMock.mockResolvedValue(products)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    queryClient.clear()
    container.remove()
    document.body.innerHTML = ''
  })

  async function render() {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ProductList />
        </QueryClientProvider>,
      )
    })
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

  async function clickButton(button: HTMLButtonElement | null) {
    await act(async () => {
      button?.click()
      await Promise.resolve()
    })
  }

  it('busca produtos por nome e inclui nome e código de barras na orientação', async () => {
    await render()
    await waitForText('Água mineral')

    const search = container.querySelector<HTMLInputElement>('input[type="search"]')
    expect(search?.labels?.[0]?.textContent).toBe('Buscar produto')
    expect(search?.placeholder).toBe('Nome ou código de barras')

    setFieldValue('input[type="search"]', 'especial')

    expect(container.textContent).toContain('Café especial')
    expect(container.textContent).not.toContain('Café gelado')
    expect(container.textContent).not.toContain('Água mineral')
  })

  it('busca por código de barras', async () => {
    await render()
    await waitForText('Água mineral')

    setFieldValue('input[type="search"]', '0000002')

    expect(container.textContent).toContain('Café gelado')
    expect(container.textContent).not.toContain('Café especial')
    expect(container.textContent).not.toContain('Água mineral')
  })

  it('carrega categorias da API e filtra pela categoria selecionada', async () => {
    await render()
    await waitForText('Água mineral')

    const categorySelect = container.querySelector<HTMLSelectElement>('#product-category-filter')
    expect(categorySelect?.options[1]?.textContent).toBe('Mercearia')
    expect(categorySelect?.options[2]?.textContent).toBe('Bebidas')

    setFieldValue('#product-category-filter', '7')

    expect(container.textContent).toContain('Café especial')
    expect(container.textContent).not.toContain('Café gelado')
    expect(container.textContent).not.toContain('Água mineral')
    expect(getCategoriesMock).toHaveBeenCalledTimes(1)
  })

  it('combina busca textual e categoria', async () => {
    await render()
    await waitForText('Água mineral')

    setFieldValue('input[type="search"]', 'café')
    setFieldValue('#product-category-filter', '23')

    expect(container.textContent).toContain('Café gelado')
    expect(container.textContent).not.toContain('Café especial')
    expect(container.textContent).not.toContain('Água mineral')
  })

  it('limpa todos os filtros', async () => {
    await render()
    await waitForText('Água mineral')

    setFieldValue('input[type="search"]', 'especial')
    setFieldValue('#product-category-filter', '7')
    const clearButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Limpar filtros'),
    )

    await act(async () => {
      clearButton?.click()
    })

    expect(container.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('')
    expect(container.querySelector<HTMLSelectElement>('#product-category-filter')?.value).toBe('')
    expect(container.textContent).toContain('Café especial')
    expect(container.textContent).toContain('Café gelado')
    expect(container.textContent).toContain('Água mineral')
  })

  it('informa quando os filtros não encontram produtos', async () => {
    await render()
    await waitForText('Água mineral')

    setFieldValue('input[type="search"]', 'produto inexistente')

    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'Nenhum produto encontrado. Ajuste ou limpe os filtros.',
    )
  })

  it('apresenta estado de carregamento enquanto consulta produtos', async () => {
    getProductsMock.mockReturnValueOnce(new Promise(() => undefined))

    await render()

    expect(container.querySelector('[role="status"]')?.textContent).toBe('Carregando produtos...')
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('mostra erro e permite tentar novamente ao falhar a listagem', async () => {
    getProductsMock.mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce(products)

    await render()
    await waitForText('Não foi possível carregar os produtos.')

    const retryButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Tentar novamente'),
    )

    await act(async () => {
      retryButton?.click()
    })
    await waitForText('Água mineral')

    expect(getProductsMock).toHaveBeenCalledTimes(2)
  })

  it('permite tentar novamente quando as categorias falham', async () => {
    getCategoriesMock.mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce(categories)

    await render()
    await waitForText('Água mineral')
    await waitForText('Não foi possível carregar as categorias.')

    const retryButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Tentar novamente'),
    )

    await act(async () => {
      retryButton?.click()
    })
    await waitForText('Bebidas')

    expect(getCategoriesMock).toHaveBeenCalledTimes(2)
  })

  it('abre o formulário preenchido e mostra o estoque sem permitir alterá-lo', async () => {
    await render()
    await waitForText('Água mineral')
    container.querySelector<HTMLButtonElement>('button[aria-label="Editar Café especial"]')?.click()
    await waitForText('Editar produto')

    expect(document.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe('Café especial')
    expect(document.querySelector<HTMLInputElement>('input[name="barcode"]')?.value).toBe('7891000000001')
    expect(document.querySelector<HTMLSelectElement>('#product-edit-category')?.value).toBe('7')
    expect(document.querySelector<HTMLInputElement>('input[name="price"]')?.value).toBe('18,50')

    const stockInput = document.querySelector<HTMLInputElement>('input[readonly]')
    expect(stockInput?.value).toBe('12')
    expect(stockInput?.labels?.[0]?.textContent).toBe('Estoque atual')
    expect(document.querySelector('[name="stock"]')).toBeNull()
  })

  it('altera os campos, seleciona categoria e salva os dados mantendo o estoque', async () => {
    const updatedProduct: ProductRecord = {
      ...products[0],
      name: 'Café premium',
      barcode: '7891999999999',
      categoryId: 23,
      category: 'Bebidas',
      price: 20.75,
    }
    updateProductMock.mockResolvedValueOnce(updatedProduct)

    await render()
    await waitForText('Água mineral')
    container.querySelector<HTMLButtonElement>('button[aria-label="Editar Café especial"]')?.click()
    await waitForText('Editar produto')

    setFieldValue('[name="name"]', 'Café premium')
    setFieldValue('[name="barcode"]', '7891999999999')
    setFieldValue('#product-edit-category', '23')
    setFieldValue('[name="price"]', '20,75')

    await act(async () => {
      document.querySelector<HTMLFormElement>('#product-edit-form')?.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    expect(updateProductMock).toHaveBeenCalledWith(1, {
      barcode: '7891999999999',
      name: 'Café premium',
      categoryId: 23,
      price: 20.75,
      stock: 12,
    })
    expect(toastSuccessMock).toHaveBeenCalledWith('Produto atualizado com sucesso.')
    expect(document.body.textContent).not.toContain('Editar produto')
    expect(container.textContent).toContain('Café premium')
    expect(container.textContent).toContain('7891999999999')
    expect(container.textContent).toContain('Bebidas')
    expect(queryClient.getQueryData<ProductRecord[]>(['products'])?.[0]).toEqual(updatedProduct)
  })

  it('valida todos os campos obrigatórios antes de salvar', async () => {
    await render()
    await waitForText('Água mineral')
    container.querySelector<HTMLButtonElement>('button[aria-label="Editar Café especial"]')?.click()
    await waitForText('Editar produto')

    setFieldValue('[name="name"]', '')
    setFieldValue('[name="barcode"]', '')
    setFieldValue('#product-edit-category', '')
    setFieldValue('[name="price"]', '')

    await act(async () => {
      document.querySelector<HTMLFormElement>('#product-edit-form')?.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })

    expect(updateProductMock).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Informe o nome do produto.')
    expect(document.body.textContent).toContain('Informe o código de barras.')
    expect(document.body.textContent).toContain('Selecione uma categoria.')
    expect(document.body.textContent).toContain('Informe o preço.')
  })

  it('mostra mensagens de erro do backend e mantém o formulário aberto', async () => {
    updateProductMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: {
          message: 'Erro de validação.',
          errors: { barcode: 'já está cadastrado' },
        },
      },
    })

    await render()
    await waitForText('Água mineral')
    container.querySelector<HTMLButtonElement>('button[aria-label="Editar Café especial"]')?.click()
    await waitForText('Editar produto')

    await act(async () => {
      document.querySelector<HTMLFormElement>('#product-edit-form')?.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    await waitForText('já está cadastrado')
    expect(toastErrorMock).toHaveBeenCalledWith('Erro de validação. já está cadastrado')
    expect(document.body.textContent).toContain('Editar produto')
  })

  it('cancela a edição sem enviar nem alterar a listagem', async () => {
    await render()
    await waitForText('Água mineral')
    container.querySelector<HTMLButtonElement>('button[aria-label="Editar Café especial"]')?.click()
    await waitForText('Editar produto')
    setFieldValue('[name="name"]', 'Nome temporário')

    await act(async () => {
      Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Cancelar'))?.click()
    })

    expect(updateProductMock).not.toHaveBeenCalled()
    expect(document.body.textContent).not.toContain('Editar produto')
    expect(container.textContent).toContain('Café especial')
    expect(container.textContent).not.toContain('Nome temporário')
  })

  it('impede envios duplicados enquanto a atualização está pendente', async () => {
    updateProductMock.mockReturnValueOnce(new Promise(() => undefined))

    await render()
    await waitForText('Água mineral')
    container.querySelector<HTMLButtonElement>('button[aria-label="Editar Café especial"]')?.click()
    await waitForText('Editar produto')
    const form = document.querySelector<HTMLFormElement>('#product-edit-form')

    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(updateProductMock).toHaveBeenCalledTimes(1)
    expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true)
  })

  it('exibe o status ativo e informa a limitação de reativação', async () => {
    await render()
    await waitForText('Água mineral')

    expect(container.querySelector('tbody tr')?.textContent).toContain('Ativo')
    expect(container.textContent).toContain('não podem ser consultados ou reativados')
    expect(container.querySelector('button[aria-label="Desativar Café especial"]')).not.toBeNull()
  })

  it('pede confirmação antes de desativar e permite cancelar sem alterar o produto', async () => {
    await render()
    await waitForText('Água mineral')
    await clickButton(container.querySelector<HTMLButtonElement>('button[aria-label="Desativar Café especial"]'))
    await waitForText('Deseja desativar "Café especial"?')

    await act(async () => {
      Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Cancelar'))?.click()
    })

    expect(deactivateProductMock).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Café especial')
    expect(document.body.textContent).not.toContain('Deseja desativar')
  })

  it('desativa após confirmação e remove o produto do cache e da lista ativa', async () => {
    deactivateProductMock.mockResolvedValueOnce(undefined)

    await render()
    await waitForText('Água mineral')
    await clickButton(container.querySelector<HTMLButtonElement>('button[aria-label="Desativar Café especial"]'))
    await waitForText('Deseja desativar "Café especial"?')

    await act(async () => {
      Array.from(document.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Desativar produto'),
      )?.click()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    expect(deactivateProductMock).toHaveBeenCalledTimes(1)
    expect(deactivateProductMock).toHaveBeenCalledWith(1)
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Produto desativado com sucesso. Ele não aparecerá mais na lista de ativos.',
    )
    expect(container.textContent).not.toContain('Café especial')
    expect(container.textContent).toContain('Café gelado')
    expect(queryClient.getQueryData<ProductRecord[]>(['products'])).toEqual(products.slice(1))
    expect(document.body.textContent).not.toContain('Deseja desativar')
  })

  it('não mostra sucesso nem altera a listagem quando a desativação falha', async () => {
    deactivateProductMock.mockRejectedValueOnce(new Error('network error'))

    await render()
    await waitForText('Água mineral')
    await clickButton(container.querySelector<HTMLButtonElement>('button[aria-label="Desativar Café especial"]'))
    await waitForText('Deseja desativar "Café especial"?')

    await act(async () => {
      Array.from(document.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Desativar produto'),
      )?.click()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Não foi possível desativar o produto. Nenhuma alteração foi confirmada.',
    )
    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Café especial')
    expect(queryClient.getQueryData<ProductRecord[]>(['products'])).toEqual(products)
    expect(document.body.textContent).toContain('Deseja desativar "Café especial"?')
  })

  it('impede solicitações duplicadas enquanto aguarda a API de desativação', async () => {
    let resolveDeactivation: (() => void) | undefined
    deactivateProductMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveDeactivation = resolve
      }),
    )

    await render()
    await waitForText('Água mineral')
    await clickButton(container.querySelector<HTMLButtonElement>('button[aria-label="Desativar Café especial"]'))
    await waitForText('Deseja desativar "Café especial"?')
    const confirmButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Desativar produto'),
    )

    await act(async () => {
      confirmButton?.click()
      confirmButton?.click()
      await Promise.resolve()
    })

    await waitForText('Desativando...')
    expect(deactivateProductMock).toHaveBeenCalledTimes(1)
    expect(confirmButton?.textContent).toContain('Desativando...')
    expect(confirmButton?.disabled).toBe(true)
    expect(container.textContent).toContain('Café especial')

    await act(async () => {
      resolveDeactivation?.()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
  })
})
