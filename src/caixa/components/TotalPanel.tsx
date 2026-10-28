import { Button } from '../../shared/components/Button/Button'
import { Card } from '../../shared/components/Card/Card'
import styles from './TotalPanel.module.css'

type TotalPanelProps = {
  subtotal: number
  discountAmount: number
  total: number
  totalItems: number
  onEditDiscount: () => void
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function TotalPanel({ subtotal, discountAmount, total, totalItems, onEditDiscount }: TotalPanelProps) {
  return (
    <Card title="Resumo da venda" className={styles.card}>
      <div className={styles.metric}>
        <span className={styles.label}>Subtotal</span>
        <strong className={styles.count}>{formatCurrency(subtotal)}</strong>
      </div>

      <div className={styles.metric}>
        <span className={styles.label}>Desconto</span>
        <strong className={styles.count}>- {formatCurrency(discountAmount)}</strong>
        <Button type="button" variant="secondary" onClick={onEditDiscount}>
          {discountAmount > 0 ? 'Alterar desconto (F8)' : 'Aplicar desconto (F8)'}
        </Button>
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

      <p className={styles.hint}>Use o scanner e o teclado para concluir a venda sem tirar as maos do caixa.</p>
    </Card>
  )
}