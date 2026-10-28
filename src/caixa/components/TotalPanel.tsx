import { Card } from '../../shared/components/Card/Card'
import styles from './TotalPanel.module.css'

type TotalPanelProps = {
  subtotal: number
  discountAmount: number
  total: number
  totalItems: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function TotalPanel({ subtotal, discountAmount, total, totalItems }: TotalPanelProps) {
  return (
    <Card title="Resumo da venda" className={styles.card}>
      <div className={styles.metric}>
        <span className={styles.label}>Subtotal</span>
        <strong className={styles.count}>{formatCurrency(subtotal)}</strong>
      </div>

      <div className={styles.metric}>
        <span className={styles.label}>Desconto</span>
        <strong className={styles.count}>- {formatCurrency(discountAmount)}</strong>
      </div>

      <div className={styles.metric}>
        <span className={styles.label}>Total</span>
        <strong className={styles.amount}>{formatCurrency(total)}</strong>
      </div>

      <div className={styles.metric}>
        <span className={styles.label}>Itens</span>
        <strong className={styles.count}>{totalItems}</strong>
      </div>

      <div className={styles.shortcutList}>
        <div className={styles.shortcutItem}>
          <span>F2</span>
          <strong>Adicionar produto</strong>
        </div>
        <div className={styles.shortcutItem}>
          <span>F8</span>
          <strong>Desconto</strong>
        </div>
        <div className={styles.shortcutItem}>
          <span>F9</span>
          <strong>Finalizar</strong>
        </div>
        <div className={styles.shortcutItem}>
          <span>ESC</span>
          <strong>Cancelar</strong>
        </div>
      </div>
    </Card>
  )
}