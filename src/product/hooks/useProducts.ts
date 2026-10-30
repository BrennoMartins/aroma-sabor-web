import { useQuery } from '@tanstack/react-query'
import {
  getInactiveProducts,
  getProductCatalog,
  getProducts,
  type ProductCatalogParams,
} from '../services/productApi'

export const PRODUCTS_QUERY_KEY = ['products'] as const
export const INACTIVE_PRODUCTS_QUERY_KEY = ['products', 'inactive'] as const
export const PRODUCT_CATALOG_QUERY_KEY = [...PRODUCTS_QUERY_KEY, 'catalog'] as const

export function useProductCatalog(params: ProductCatalogParams, enabled: boolean) {
  return useQuery({
    queryKey: [...PRODUCT_CATALOG_QUERY_KEY, params] as const,
    queryFn: ({ signal }) => getProductCatalog(params, signal),
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

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
