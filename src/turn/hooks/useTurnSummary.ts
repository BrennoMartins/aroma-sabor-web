import { useQuery } from '@tanstack/react-query'
import { getTurnSummary } from '../services/turnApi'

export const turnSummaryQueryKey = (turnId: string | null | undefined) =>
  ['turns', 'summary', turnId] as const

export function useTurnSummary(turnId: string | null | undefined) {
  return useQuery({
    queryKey: turnSummaryQueryKey(turnId),
    queryFn: () => {
      if (!turnId) {
        throw new Error('A turn ID is required to load its summary.')
      }

      return getTurnSummary(turnId)
    },
    enabled: Boolean(turnId),
    retry: false,
    refetchOnWindowFocus: false,
  })
}
