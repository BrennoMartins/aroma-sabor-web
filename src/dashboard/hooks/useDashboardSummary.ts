import { useQuery } from '@tanstack/react-query'
import { getDashboardSummary } from '../services/dashboardApi'

export const DASHBOARD_QUERY_KEY = ['dashboard', 'summary'] as const

export function useDashboardSummary() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: getDashboardSummary,
    staleTime: 15_000,
    retry: false,
  })
}
