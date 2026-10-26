import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../shared/api/axios'
import { getStockMovements, InvalidStockMovementPageError } from './stockMovementApi'

vi.mock('../../shared/api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}))

const pageResponse = {
  content: [
    {
      id: 42,
      productId: 7,
      productName: 'Arroz',
      movementType: 'ENTRY',
      quantity: 5,
      createdAt: '2026-10-25T18:30:00',
      reason: 'Nota fiscal 31',
      referenceSaleId: null,
    },
  ],
  number: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
  first: true,
  last: true,
  empty: false,
}

describe('getStockMovements', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('consulta os filtros e a paginação com os parâmetros reais e valida a resposta Spring Page', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: pageResponse })
    const filters = {
      productId: 7,
      movementType: 'ENTRY' as const,
      startDate: '2026-10-01T00:00:00',
      endDate: '2026-10-31T23:59:59.999999',
      page: 1,
      size: 20,
    }

    await expect(getStockMovements(filters)).resolves.toMatchObject({
      content: [{ productName: 'Arroz', referenceSaleId: null }],
      number: 0,
      totalPages: 1,
      totalElements: 1,
    })
    expect(api.get).toHaveBeenCalledWith('/stock-movements', { params: filters })
  })

  it('omite filtros vazios e mantém os parâmetros de paginação', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { ...pageResponse, content: [], totalElements: 0, totalPages: 0, empty: true },
    })

    await expect(getStockMovements({ page: 2, size: 20 })).resolves.toMatchObject({
      content: [],
      number: 0,
      empty: true,
    })
    expect(api.get).toHaveBeenCalledWith('/stock-movements', { params: { page: 2, size: 20 } })
  })

  it('rejeita resposta fora do contrato da página', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { content: [] } })

    await expect(getStockMovements({ page: 0, size: 20 })).rejects.toBeInstanceOf(InvalidStockMovementPageError)
  })
})
