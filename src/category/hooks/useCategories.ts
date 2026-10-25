import { useQuery } from '@tanstack/react-query'
import { getCategories } from '../services/categoryApi'

export const CATEGORIES_QUERY_KEY = ['categories'] as const

export function useCategories(enabled: boolean) {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: getCategories,
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
