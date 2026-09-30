import { useCallback, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '../../shared/components/Toast/toast-store'
import { closeTurn, getCurrentTurn, openTurn } from '../services/turnApi'
import { getTurnErrorMessage, isTurnConflict } from '../services/turnErrorMessage'
import type { MarketSession, UseMarketSessionResult } from '../types/marketSession'

const TURN_QUERY_KEY = ['turns', 'current'] as const

export function formatMarketElapsedTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':')
}

export function useMarketElapsedTime(openedAt: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!openedAt) {
      return
    }

    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [openedAt])

  const elapsedSeconds = useMemo(() => {
    if (!openedAt) {
      return 0
    }

    const openedAtTimestamp = new Date(openedAt).getTime()

    if (Number.isNaN(openedAtTimestamp)) {
      return 0
    }

    return Math.max(0, Math.floor((now - openedAtTimestamp) / 1000))
  }, [now, openedAt])

  return {
    elapsedSeconds,
    elapsedTime: formatMarketElapsedTime(elapsedSeconds),
  }
}

export function useMarketSession(): UseMarketSessionResult {
  const queryClient = useQueryClient()
  const currentTurnQuery = useQuery({
    queryKey: TURN_QUERY_KEY,
    queryFn: async (): Promise<MarketSession | null> => {
      try {
        return await getCurrentTurn()
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          return null
        }

        throw error
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  })

  const openMutation = useMutation({
    mutationFn: openTurn,
    onSuccess: (turn) => {
      queryClient.setQueryData(TURN_QUERY_KEY, turn)
      toast.success('Mercado aberto. Turno iniciado com sucesso.')
    },
  })

  const closeMutation = useMutation({
    mutationFn: ({ turnId, closingNote }: { turnId: string; closingNote: string }) =>
      closeTurn(turnId, { closingNote }),
    onSuccess: () => {
      queryClient.setQueryData(TURN_QUERY_KEY, null)
      toast.success('Mercado fechado com sucesso.')
    },
  })

  const openMarket = useCallback(
    async (payload: Parameters<typeof openTurn>[0]) => {
      try {
        return await openMutation.mutateAsync(payload)
      } catch (error) {
        if (isTurnConflict(error)) {
          toast.info(getTurnErrorMessage(error))
          const refreshedTurn = await queryClient.fetchQuery({
            queryKey: TURN_QUERY_KEY,
            queryFn: getCurrentTurn,
          })

          return refreshedTurn ?? null
        }

        throw error
      }
    },
    [openMutation, queryClient],
  )

  const closeMarket = useCallback(
    async ({ closingNote }: { closingNote: string }) => {
      const currentTurn = currentTurnQuery.data

      if (!currentTurn) {
        throw new Error('No open turn found.')
      }

      await closeMutation.mutateAsync({ turnId: currentTurn.id, closingNote })
    },
    [closeMutation, currentTurnQuery.data],
  )

  const refreshCurrentTurn = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: TURN_QUERY_KEY })
  }, [queryClient])

  const currentTurn = currentTurnQuery.data ?? null

  return {
    currentTurn,
    isOpen: currentTurn?.status === 'OPEN',
    isLoading: currentTurnQuery.isPending,
    error: currentTurnQuery.error ? getTurnErrorMessage(currentTurnQuery.error) : null,
    isOpening: openMutation.isPending,
    isClosing: closeMutation.isPending,
    openMarket,
    closeMarket,
    refreshCurrentTurn,
  }
}
