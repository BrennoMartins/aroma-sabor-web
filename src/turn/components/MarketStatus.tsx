import { Clock3, Store } from 'lucide-react'
import { Badge } from '../../shared/components/Badge/Badge'
import styles from './MarketStatus.module.css'

type MarketStatusProps = {
  isOpen: boolean
  elapsedTime: string
  className?: string
}

export function MarketStatus({ isOpen, elapsedTime, className }: MarketStatusProps) {
  const statusLabel = isOpen ? '🟢 Mercado Aberto' : '🔴 Mercado Fechado'
  const badgeVariant = isOpen ? 'success' : 'danger'

  return (
    <div className={[styles.marketStatus, className].filter(Boolean).join(' ')} aria-live="polite" aria-label="Status do mercado">
      <span className={styles.iconWrap} aria-hidden="true">
        <Store size={16} />
      </span>

      <div className={styles.info}>
        <span className={styles.label}>Mercado</span>
        <Badge variant={badgeVariant}>{statusLabel}</Badge>
      </div>

      <div className={styles.timer} aria-label="Tempo do turno">
        <Clock3 size={14} aria-hidden="true" />
        <strong>{elapsedTime}</strong>
      </div>
    </div>
  )
}
