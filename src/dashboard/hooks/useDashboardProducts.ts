import { useQuery } from '@tanstack/react-query'
import { getLowStockProducts, getTopProducts } from '../services/dashboardApi'

export const DASHBOARD_TOP_PRODUCTS_QUERY_KEY = ['dashboard', 'top-products'] as const
export const DASHBOARD_LOW_STOCK_QUERY_KEY = ['dashboard', 'low-stock'] as const

export function useDashboardTopProducts() {
  return useQuery({
    queryKey: DASHBOARD_TOP_PRODUCTS_QUERY_KEY,
    queryFn: getTopProducts,
    staleTime: 15_000,
    retry: false,
  })
}

export function useDashboardLowStockProducts() {
  return useQuery({
    queryKey: DASHBOARD_LOW_STOCK_QUERY_KEY,
    queryFn: getLowStockProducts,
    staleTime: 15_000,
    retry: false,
  })
}
