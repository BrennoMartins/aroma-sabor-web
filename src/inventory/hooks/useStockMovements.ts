import { useQuery } from '@tanstack/react-query'
import { getStockMovements, type StockMovementFilters } from '../services/stockMovementApi'

export const STOCK_MOVEMENTS_QUERY_KEY = ['stockMovements'] as const

export function useStockMovements(filters: StockMovementFilters, enabled = true) {
  return useQuery({
    queryKey: [...STOCK_MOVEMENTS_QUERY_KEY, filters] as const,
    queryFn: () => getStockMovements(filters),
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
