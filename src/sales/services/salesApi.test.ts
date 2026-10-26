import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../shared/api/axios'
import { getSaleById, getSales, InvalidSaleResponseError } from './salesApi'

vi.mock('../../shared/api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}))

const sale = {
  id: 41,
  total: 29.98,
  status: 'COMPLETED',
  createdAt: '2026-10-25T10:30:00',
  items: [
    {
      productId: 8,
      productName: 'Café',
      quantity: 2,
      unitPrice: 14.99,
      subtotal: 29.98,
    },
  ],
}

describe('salesApi', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('carrega vendas e valida os dados históricos retornados pela API', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [sale] })

    await expect(getSales()).resolves.toEqual([sale])
    expect(api.get).toHaveBeenCalledWith('/sales')
  })

  it('consulta o endpoint real de detalhe pelo identificador da venda', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: sale })

    await expect(getSaleById('41')).resolves.toEqual(sale)
    expect(api.get).toHaveBeenCalledWith('/sales/41')
  })

  it('rejeita respostas que não correspondem ao DTO de venda', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [{ ...sale, items: undefined }] })

    await expect(getSales()).rejects.toBeInstanceOf(InvalidSaleResponseError)
  })
})
