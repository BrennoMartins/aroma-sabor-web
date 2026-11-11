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
  grossProfitKnownAmount: 8,
  grossProfitComplete: true,
  itemsWithoutHistoricalCost: 0,
  items: [
    {
      productId: 8,
      productName: 'Café',
      categoryId: 3,
      categoryName: 'Mercearia',
      quantity: 2,
      unitPrice: 14.99,
      unitCostPrice: 8.5,
      subtotal: 29.98,
      discountAllocatedAmount: 1.25,
    },
  ],
}

const oldItem = {
  productId: 8,
  quantity: 2,
  unitPrice: 14.99,
  subtotal: 29.98,
}

const normalizedOldItem = {
  ...oldItem,
  productName: null,
  categoryId: null,
  categoryName: null,
  unitCostPrice: null,
  discountAllocatedAmount: null,
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

  it('aceita subtotal, desconto e lucro bruto conhecido negativo', async () => {
    const discounted = { ...sale, subtotal: 40, discountAmount: 10, total: 30, grossProfitKnownAmount: -2, grossProfitComplete: false }
    vi.mocked(api.get).mockResolvedValueOnce({ data: discounted })

    await expect(getSaleById('41')).resolves.toEqual(discounted)
  })

  it('não preenche subtotal nem desconto quando a resposta é antiga', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: sale })

    const result = await getSaleById('41')
    expect(result.subtotal).toBeUndefined()
    expect(result.discountAmount).toBeUndefined()
  })

  it('preserva campos históricos nulos sem reconstruí-los', async () => {
    const legacySale = {
      ...sale,
      items: [{
        productId: 9,
        productName: null,
        categoryId: null,
        categoryName: null,
        quantity: 1,
        unitPrice: 5,
        unitCostPrice: null,
        subtotal: 5,
        discountAllocatedAmount: null,
      }],
    }
    vi.mocked(api.get).mockResolvedValueOnce({ data: legacySale })

    await expect(getSaleById('41')).resolves.toEqual(legacySale)
  })

  it('normaliza campos históricos ausentes no detalhe sem inventar valores monetários', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { ...sale, items: [oldItem] } })

    await expect(getSaleById('41')).resolves.toEqual({ ...sale, items: [normalizedOldItem] })
  })

  it('processa vendas dos contratos antigo e atual na mesma listagem', async () => {
    const oldSale = { ...sale, id: 40, items: [oldItem] }
    vi.mocked(api.get).mockResolvedValueOnce({ data: [oldSale, sale] })

    await expect(getSales()).resolves.toEqual([
      { ...oldSale, items: [normalizedOldItem] },
      sale,
    ])
  })

  it('preserva custo e desconto alocado iguais a zero', async () => {
    const zeroSale = {
      ...sale,
      items: [{ ...sale.items[0], unitCostPrice: 0, discountAllocatedAmount: 0 }],
    }
    vi.mocked(api.get).mockResolvedValueOnce({ data: zeroSale })

    await expect(getSaleById('41')).resolves.toEqual(zeroSale)
  })

  it('preserva lucro bruto indeterminado quando falta custo histórico', async () => {
    const result = {
      ...sale,
      grossProfitKnownAmount: null,
      grossProfitComplete: false,
      itemsWithoutHistoricalCost: 1,
      items: [{ ...sale.items[0], unitCostPrice: null }],
    }
    vi.mocked(api.get).mockResolvedValueOnce({ data: result })

    await expect(getSaleById('41')).resolves.toEqual(result)
  })

  it('preserva lucro bruto conhecido igual a zero', async () => {
    const result = { ...sale, grossProfitKnownAmount: 0 }
    vi.mocked(api.get).mockResolvedValueOnce({ data: result })

    await expect(getSaleById('41')).resolves.toEqual(result)
  })

  it.each(['quantity', 'unitPrice', 'subtotal'] as const)(
    'rejeita item sem campo financeiro essencial %s',
    async (field) => {
      const item: Partial<typeof oldItem> = { ...oldItem }
      delete item[field]
      vi.mocked(api.get).mockResolvedValueOnce({ data: { ...sale, items: [item] } })

      await expect(getSaleById('41')).rejects.toBeInstanceOf(InvalidSaleResponseError)
    },
  )

  it.each([
    ['productName', 123],
    ['categoryId', '3'],
    ['categoryName', 123],
    ['unitCostPrice', '8.5'],
    ['discountAllocatedAmount', '1.25'],
  ])('rejeita tipo inválido para o campo histórico %s', async (field, value) => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { ...sale, items: [{ ...oldItem, [field]: value }] },
    })

    await expect(getSaleById('41')).rejects.toBeInstanceOf(InvalidSaleResponseError)
  })

  it('rejeita respostas que não correspondem ao DTO de venda', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [{ ...sale, items: undefined }] })

    await expect(getSales()).rejects.toBeInstanceOf(InvalidSaleResponseError)
  })
})
