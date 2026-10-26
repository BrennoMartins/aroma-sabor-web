import { useQuery } from '@tanstack/react-query'
import { getSaleById, getSales } from '../services/salesApi'

export const SALES_QUERY_KEY = ['sales'] as const
export const saleDetailsQueryKey = (saleId: string | null | undefined) =>
  [...SALES_QUERY_KEY, 'detail', saleId] as const

export function useSalesHistory(enabled = true) {
  return useQuery({
    queryKey: SALES_QUERY_KEY,
    queryFn: getSales,
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useSaleDetails(saleId: string | undefined) {
  return useQuery({
    queryKey: saleDetailsQueryKey(saleId),
    queryFn: () => {
      if (!saleId) {
        throw new Error('A sale ID is required to load its details.')
      }

      return getSaleById(saleId)
    },
    enabled: Boolean(saleId),
    retry: false,
    refetchOnWindowFocus: false,
  })
}
