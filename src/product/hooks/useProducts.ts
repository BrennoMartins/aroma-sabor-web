import { useQuery } from '@tanstack/react-query'
import { getProducts } from '../services/productApi'

export const PRODUCTS_QUERY_KEY = ['products'] as const

export function useProducts() {
  return useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: getProducts,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
