import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '../../shared/components/Toast/toast-store'
import type { UseMarketSessionResult } from '../types/marketSession'

export function formatMarketElapsedTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':')
}

export function useMarketSession(): UseMarketSessionResult {
  const [openedAt, setOpenedAt] = useState<number | null>(null)
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

  const elapsedTime = useMemo(() => {
    if (!openedAt) {
      return 0
    }

    return Math.max(0, Math.floor((now - openedAt) / 1000))
  }, [now, openedAt])

  const openMarket = useCallback(() => {
    if (openedAt !== null) {
      return
    }

    const nextOpenedAt = Date.now()
    setOpenedAt(nextOpenedAt)
    toast.success('Mercado aberto. Turno iniciado com sucesso.')
  }, [openedAt])

  const closeMarket = useCallback(() => {
    if (openedAt === null) {
      return
    }

    const duration = Math.max(0, Math.floor((Date.now() - openedAt) / 1000))
    setOpenedAt(null)
    toast.error(`Mercado fechado. Duração do turno: ${formatMarketElapsedTime(duration)}.`)
  }, [openedAt])

  return {
    isOpen: openedAt !== null,
    openedAt,
    elapsedTime,
    openMarket,
    closeMarket,
  }
}
