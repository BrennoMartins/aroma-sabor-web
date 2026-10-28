import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../shared/api/axios'
import {
  adjustProductStock,
  discardProductStock,
  deactivateProduct,
  getInactiveProducts,
  getProductById,
  getProducts,
  reactivateProduct,
  replenishProduct,
  updateProduct,
} from './productApi'

vi.mock('../../shared/api/axios', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
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
          costPrice: 7.25,
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
        costPrice: 7.25,
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

  describe('getInactiveProducts', () => {
    beforeEach(() => {
      vi.mocked(api.get).mockReset()
    })

    it('consulta somente os produtos inativos no endpoint dedicado', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: [{
          id: 17,
          name: 'Café',
          barcode: '7891000000001',
          category: { id: 23, name: 'Mercearia' },
          price: 18.5,
          stock: 12,
          active: false,
        }],
      })

      await expect(getInactiveProducts()).resolves.toMatchObject([
        { id: 17, active: false, stockQuantity: 12, category: 'Mercearia' },
      ])
      expect(api.get).toHaveBeenCalledWith('/products/inactive')
    })
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

  it('envia somente os dados cadastrais sem buscar ou reenviar o estoque', async () => {
    const payload = {
      barcode: '7891000000002',
      name: 'Café atualizado',
      categoryId: 23,
      price: 20.75,
      costPrice: 15.5,
    }
    vi.mocked(api.put).mockResolvedValueOnce({
      data: {
        id: 17,
        name: 'Café atualizado',
        barcode: '7891000000002',
        category: { id: 23, name: 'Bebidas' },
        price: 20.75,
        costPrice: 15.5,
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
      costPrice: 15.5,
      stockQuantity: 9,
      active: true,
    })
    expect(api.get).not.toHaveBeenCalled()
    expect(api.put).toHaveBeenCalledWith('/products/17', payload)
  })
})

describe('deactivateProduct', () => {
  beforeEach(() => {
    vi.mocked(api.delete).mockReset()
  })

  describe('stock operations', () => {
    beforeEach(() => {
      vi.mocked(api.post).mockReset()
    })

    it('reativa o produto pelo endpoint existente e mapeia a resposta', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          id: 17,
          name: 'Café',
          barcode: '7891000000001',
          category: { id: 23, name: 'Mercearia' },
          price: 18.5,
          stock: 12,
          active: true,
        },
      })

      await expect(reactivateProduct(17)).resolves.toMatchObject({ id: 17, active: true, stockQuantity: 12 })
      expect(api.post).toHaveBeenCalledWith('/products/17/reactivate')
    })

    it('envia o contrato de reposição sem alterar localmente o saldo', async () => {
      const payload = { quantity: 5, reason: 'Nota fiscal 31' }
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          id: 17,
          name: 'Café',
          barcode: '7891000000001',
          category: { id: 23, name: 'Mercearia' },
          price: 18.5,
          stock: 17,
          active: true,
        },
      })

      await expect(replenishProduct(17, payload)).resolves.toMatchObject({ id: 17, stockQuantity: 17 })
      expect(api.post).toHaveBeenCalledWith('/products/17/replenishments', payload)
    })

    it('envia a quantidade física final e justificativa para ajuste', async () => {
      const payload = { quantityOnHand: 0, reason: 'Contagem física' }
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          id: 17,
          name: 'Café',
          barcode: '7891000000001',
          category: { id: 23, name: 'Mercearia' },
          price: 18.5,
          stock: 0,
          active: true,
        },
      })

      await expect(adjustProductStock(17, payload)).resolves.toMatchObject({ id: 17, stockQuantity: 0 })
      expect(api.post).toHaveBeenCalledWith('/products/17/stock-adjustments', payload)
    })

    it('envia o descarte e valida a movimentação retornada pela API', async () => {
      const payload = {
        quantity: 2,
        reason: 'DAMAGED' as const,
        observation: 'Pacote violado',
      }
      const response = {
        id: 41,
        productId: 17,
        productName: 'Café',
        movementType: 'DISCARD',
        quantity: -2,
        createdAt: '2026-10-25T18:30:00',
        reason: 'Pacote violado',
        discardReason: 'DAMAGED',
        referenceSaleId: null,
      }
      vi.mocked(api.post).mockResolvedValueOnce({ data: response })

      await expect(discardProductStock(17, payload)).resolves.toEqual(response)
      expect(api.post).toHaveBeenCalledWith('/products/17/discards', payload)
    })

    it('rejeita resposta do descarte fora do contrato da movimentação', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: { id: 41 } })

      await expect(discardProductStock(17, {
        quantity: 2,
        reason: 'OTHER',
      })).rejects.toThrow()
    })
  })

  it('usa o endpoint DELETE existente para desativar sem enviar alterações cadastrais', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ data: undefined })

    await expect(deactivateProduct(17)).resolves.toBeUndefined()

    expect(api.delete).toHaveBeenCalledWith('/products/17')
  })
})
