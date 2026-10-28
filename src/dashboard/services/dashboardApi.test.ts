import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../shared/api/axios'
import {
  getDashboardSummary,
  getLowStockProducts,
  getTopProducts,
  InvalidDashboardSummaryError,
  InvalidLowStockResponseError,
  InvalidTopProductsResponseError,
} from './dashboardApi'

vi.mock('../../shared/api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}))

const summary = {
  date: '2026-10-26',
  revenue: 58.5,
  salesCount: 2,
  averageTicket: 29.25,
  grossProfitKnownAmount: 14.5,
  grossProfitComplete: true,
  itemsWithoutHistoricalCost: 0,
  currentTurn: {
    id: '7a25b021-7f7c-4c0c-a343-2d7c784d5339',
    openedAt: '2026-10-26T08:00:00',
  },
  recentSales: [
    {
      id: 104,
      createdAt: '2026-10-26T09:35:00',
      total: 38.5,
    },
  ],
}

describe('getDashboardSummary', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('loads the dashboard summary endpoint and validates its response', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: summary })

    await expect(getDashboardSummary()).resolves.toEqual(summary)
    expect(api.get).toHaveBeenCalledWith('/dashboard/summary')
  })

  it('accepts an explicit null current turn', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { ...summary, currentTurn: null } })

    await expect(getDashboardSummary()).resolves.toMatchObject({ currentTurn: null })
  })

  it('rejects malformed data instead of presenting it as real indicators', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { ...summary, recentSales: [{ id: 104, total: '38.50', createdAt: 'invalid' }] },
    })

    await expect(getDashboardSummary()).rejects.toBeInstanceOf(InvalidDashboardSummaryError)
  })

  it('loads and validates the top-products contract', async () => {
    const products = [{ productId: 23, productName: 'Café', quantitySold: 14 }]
    vi.mocked(api.get).mockResolvedValueOnce({ data: products })

    await expect(getTopProducts()).resolves.toEqual(products)
    expect(api.get).toHaveBeenCalledWith('/dashboard/top-products')
  })

  it('rejects invalid top-products payloads', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [{ productId: 23, productName: 'Café', quantitySold: '14' }],
    })

    await expect(getTopProducts()).rejects.toBeInstanceOf(InvalidTopProductsResponseError)
  })

  it('loads and validates the low-stock contract', async () => {
    const products = [{ id: 8, name: 'Arroz', barcode: '789123', stock: 0 }]
    vi.mocked(api.get).mockResolvedValueOnce({ data: products })

    await expect(getLowStockProducts()).resolves.toEqual(products)
    expect(api.get).toHaveBeenCalledWith('/dashboard/low-stock')
  })

  it('rejects invalid low-stock payloads', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [{ id: 8, name: 'Arroz', barcode: '789123', stock: '0' }],
    })

    await expect(getLowStockProducts()).rejects.toBeInstanceOf(InvalidLowStockResponseError)
  })
})
