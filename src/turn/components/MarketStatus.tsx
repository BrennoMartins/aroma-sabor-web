import { Clock3, Store } from 'lucide-react'
import { useMarketElapsedTime } from '../hooks/useMarketSession'
import { Badge } from '../../shared/components/Badge/Badge'
import type { MarketSession } from '../types/marketSession'
import styles from './MarketStatus.module.css'

type MarketStatusProps = {
  turn: MarketSession | null
  isLoading?: boolean
  className?: string
}

export function MarketStatus({ turn, isLoading = false, className }: MarketStatusProps) {
  const isOpen = turn?.status === 'OPEN'
  const { elapsedTime } = useMarketElapsedTime(isOpen ? turn?.openedAt : null)
  const statusLabel = isLoading ? 'Verificando mercado' : isOpen ? '🟢 Mercado Aberto' : '🔴 Mercado Fechado'
  const badgeVariant = isLoading ? 'neutral' : isOpen ? 'success' : 'danger'

  return (
    <div className={[styles.marketStatus, className].filter(Boolean).join(' ')} aria-live="polite" aria-label="Status do mercado">
      <span className={styles.iconWrap} aria-hidden="true">
        <Store size={16} />
      </span>

      <div className={styles.info}>
        <span className={styles.label}>Mercado</span>
        <Badge variant={badgeVariant}>{statusLabel}</Badge>
      </div>

      {isOpen ? (
        <div className={styles.timer} aria-label="Tempo do turno">
          <Clock3 size={14} aria-hidden="true" />
          <strong>{elapsedTime}</strong>
        </div>
      ) : null}
    </div>
  )
}
