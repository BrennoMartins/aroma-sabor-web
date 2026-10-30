import { beforeEach, describe, expect, it, vi } from 'vitest'

const postMock = vi.fn()

vi.mock('../../shared/api/axios', () => ({
  api: { post: (...args: unknown[]) => postMock(...args) },
}))

import { createSale, InvalidCreateSaleResponseError } from './saleApi'

describe('createSale', () => {
  beforeEach(() => {
    postMock.mockReset()
  })

  it('envia discountAmount e items[].unitPrice ao endpoint de vendas', async () => {
    postMock.mockResolvedValue({ data: { id: 1, total: 22 } })
    const payload = { discountAmount: 3, items: [{ productId: 1, quantity: 2, unitPrice: 12.5 }] }

    await createSale(payload)

    expect(postMock).toHaveBeenCalledWith('/sales', payload)
  })

  it('aceita a resposta completa do backend, inclusive lucro bruto conhecido negativo', async () => {
    postMock.mockResolvedValue({
      data: {
        id: 7,
        subtotal: 10,
        discountAmount: 3,
        total: 7,
        status: 'COMPLETED',
        createdAt: '2026-10-28T11:00:00',
        items: [{ productId: 1, productName: 'Cafe', quantity: 1, unitPrice: 10, subtotal: 10 }],
        grossProfitKnownAmount: -2,
        grossProfitComplete: false,
        itemsWithoutHistoricalCost: 1,
      },
    })

    const result = await createSale({ discountAmount: 3, items: [{ productId: 1, quantity: 1, unitPrice: 10 }] })

    expect(result).toMatchObject({ id: 7, subtotal: 10, discountAmount: 3, total: 7, grossProfitKnownAmount: -2 })
    expect(result.items?.[0].unitPrice).toBe(10)
  })

  it('continua aceitando respostas antigas apenas com id e total', async () => {
    postMock.mockResolvedValue({ data: { id: 1, total: 25 } })

    await expect(createSale({ discountAmount: 0, items: [] })).resolves.toEqual({ id: 1, total: 25 })
  })

  it('rejeita resposta invalida', async () => {
    postMock.mockResolvedValue({ data: { id: 'x' } })

    await expect(createSale({ discountAmount: 0, items: [] })).rejects.toBeInstanceOf(InvalidCreateSaleResponseError)
  })
})
