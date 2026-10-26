import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getSalesReport } from '../services/salesReportApi'

export type SalesReportPeriod = {
  startDate: string
  endDate: string
}

export const SALES_REPORT_QUERY_KEY = ['sales-report'] as const

export function salesReportQueryKey(period: SalesReportPeriod | null) {
  return [...SALES_REPORT_QUERY_KEY, period?.startDate ?? null, period?.endDate ?? null] as const
}

export function useSalesReport(period: SalesReportPeriod | null) {
  return useQuery({
    queryKey: salesReportQueryKey(period),
    queryFn: () => {
      if (!period) {
        throw new Error('A sales report period is required.')
      }

      return getSalesReport(period.startDate, period.endDate)
    },
    enabled: Boolean(period),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
