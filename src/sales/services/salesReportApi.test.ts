import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../shared/api/axios'
import { getSalesReport, InvalidSalesReportResponseError } from './salesReportApi'

vi.mock('../../shared/api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}))

const report = {
  startDate: '2026-10-01',
  endDate: '2026-10-03',
  totalRevenue: 61,
  salesCount: 3,
  averageTicket: 20.33,
  dailySales: [
    { date: '2026-10-01', revenue: 40, salesCount: 2 },
    { date: '2026-10-02', revenue: 0, salesCount: 0 },
    { date: '2026-10-03', revenue: 21, salesCount: 1 },
  ],
}

describe('getSalesReport', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('requests the report with ISO dates and validates the complete response', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: report })

    await expect(getSalesReport('2026-10-01', '2026-10-03')).resolves.toEqual(report)
    expect(api.get).toHaveBeenCalledWith('/reports/sales', {
      params: { startDate: '2026-10-01', endDate: '2026-10-03' },
    })
  })

  it('rejects missing or invalid response fields', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { ...report, totalRevenue: '61.00' },
    })

    await expect(getSalesReport('2026-10-01', '2026-10-03'))
      .rejects.toBeInstanceOf(InvalidSalesReportResponseError)
  })

  it('rejects responses with a different period or incomplete daily entries', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { ...report, dailySales: report.dailySales.slice(0, 2) },
    })

    await expect(getSalesReport('2026-10-01', '2026-10-03'))
      .rejects.toBeInstanceOf(InvalidSalesReportResponseError)
  })

  it('rejects out-of-order daily entries', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { ...report, dailySales: [...report.dailySales].reverse() },
    })

    await expect(getSalesReport('2026-10-01', '2026-10-03'))
      .rejects.toBeInstanceOf(InvalidSalesReportResponseError)
  })
})
