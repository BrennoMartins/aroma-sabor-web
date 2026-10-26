import { useQuery } from '@tanstack/react-query'
import { getInactiveProducts, getProducts } from '../services/productApi'

export const PRODUCTS_QUERY_KEY = ['products'] as const
export const INACTIVE_PRODUCTS_QUERY_KEY = ['products', 'inactive'] as const

export function useProducts() {
  return useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: getProducts,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useInactiveProducts(enabled = true) {
  return useQuery({
    queryKey: INACTIVE_PRODUCTS_QUERY_KEY,
    queryFn: getInactiveProducts,
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
