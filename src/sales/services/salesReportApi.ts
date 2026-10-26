import { z } from 'zod'
import { api } from '../../shared/api/axios'

const DailySalesReportEntrySchema = z.object({
  date: z.iso.date(),
  revenue: z.number().finite().nonnegative(),
  salesCount: z.number().int().nonnegative(),
})

const SalesReportSchema = z.object({
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  totalRevenue: z.number().finite().nonnegative(),
  salesCount: z.number().int().nonnegative(),
  averageTicket: z.number().finite().nonnegative(),
  dailySales: z.array(DailySalesReportEntrySchema),
})

export type DailySalesReportEntry = z.infer<typeof DailySalesReportEntrySchema>
export type SalesReport = z.infer<typeof SalesReportSchema>

export class InvalidSalesReportResponseError extends Error {
  constructor() {
    super('Invalid sales report response')
    this.name = 'InvalidSalesReportResponseError'
  }
}

function nextIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]

  if (day < daysInMonth) {
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`
  }

  if (month < 12) {
    return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-01`
  }

  if (year < 9999) {
    return `${String(year + 1).padStart(4, '0')}-01-01`
  }

  return null
}

function hasCompleteDailySeries(report: SalesReport, startDate: string, endDate: string) {
  if (report.startDate !== startDate || report.endDate !== endDate || startDate > endDate) {
    return false
  }

  let expectedDate: string | null = startDate

  for (const [index, entry] of report.dailySales.entries()) {
    if (entry.date !== expectedDate) {
      return false
    }

    if (entry.date === endDate) {
      return index === report.dailySales.length - 1
    }

    expectedDate = nextIsoDate(entry.date)
    if (!expectedDate) {
      return false
    }
  }

  return false
}

export async function getSalesReport(startDate: string, endDate: string): Promise<SalesReport> {
  const response = await api.get<unknown>('/reports/sales', {
    params: { startDate, endDate },
  })
  const result = SalesReportSchema.safeParse(response.data)

  if (!result.success || !hasCompleteDailySeries(result.data, startDate, endDate)) {
    throw new InvalidSalesReportResponseError()
  }

  return result.data
}
