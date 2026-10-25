import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../shared/api/axios'
import { deactivateProduct, getProductById, getProducts, updateProduct } from './productApi'

vi.mock('../../shared/api/axios', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('getProducts', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('consulta a listagem sem filtros da API e mapeia categoria e estoque', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 17,
          name: 'Café',
          barcode: '7891000000001',
          category: { id: 23, name: 'Mercearia' },
          price: 18.5,
          stock: 12,
          active: true,
        },
      ],
    })

    await expect(getProducts()).resolves.toEqual([
      {
        id: 17,
        name: 'Café',
        barcode: '7891000000001',
        categoryId: 23,
        category: 'Mercearia',
        price: 18.5,
        stockQuantity: 12,
        active: true,
      },
    ])
    expect(api.get).toHaveBeenCalledWith('/products')
  })
})

describe('getProductById', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('busca os dados atuais do produto pelo ID', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        id: 17,
        name: 'Café',
        barcode: '7891000000001',
        category: { id: 23, name: 'Mercearia' },
        price: 18.5,
        stock: 9,
        active: true,
      },
    })

    await expect(getProductById(17)).resolves.toMatchObject({
      id: 17,
      stockQuantity: 9,
    })
    expect(api.get).toHaveBeenCalledWith('/products/17')
  })
})

describe('updateProduct', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.put).mockReset()
  })

  it('preserva o estoque atual do backend ao editar somente os dados cadastrais', async () => {
    const payload = {
      barcode: '7891000000002',
      name: 'Café atualizado',
      categoryId: 23,
      price: 20.75,
    }
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        id: 17,
        name: 'Café',
        barcode: '7891000000001',
        category: { id: 23, name: 'Mercearia' },
        price: 18.5,
        stock: 9,
        active: true,
      },
    })
    vi.mocked(api.put).mockResolvedValueOnce({
      data: {
        id: 17,
        name: 'Café atualizado',
        barcode: '7891000000002',
        category: { id: 23, name: 'Bebidas' },
        price: 20.75,
        stock: 9,
        active: true,
      },
    })

    await expect(updateProduct(17, payload)).resolves.toEqual({
      id: 17,
      name: 'Café atualizado',
      barcode: '7891000000002',
      categoryId: 23,
      category: 'Bebidas',
      price: 20.75,
      stockQuantity: 9,
      active: true,
    })
    expect(api.get).toHaveBeenCalledWith('/products/17')
    expect(api.put).toHaveBeenCalledWith('/products/17', { ...payload, stock: 9 })
  })
})

describe('deactivateProduct', () => {
  beforeEach(() => {
    vi.mocked(api.delete).mockReset()
  })

  it('usa o endpoint DELETE existente para desativar sem enviar alterações cadastrais', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ data: undefined })

    await expect(deactivateProduct(17)).resolves.toBeUndefined()

    expect(api.delete).toHaveBeenCalledWith('/products/17')
  })
})
