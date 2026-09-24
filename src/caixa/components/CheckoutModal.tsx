import { Button } from '../../shared/components/Button/Button'
import { Modal } from '../../shared/components/Modal/Modal'
import styles from './CheckoutModal.module.css'

type CheckoutModalProps = {
  isOpen: boolean
  totalItems: number
  total: number
  isSubmitting: boolean
  onConfirm: () => void
  onCancel: () => void
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function CheckoutModal({
  isOpen,
  totalItems,
  total,
  isSubmitting,
  onConfirm,
  onCancel,
}: CheckoutModalProps) {
  return (
    <Modal
      open={isOpen}
      title="Confirmar venda"
      onClose={onCancel}
      actions={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="success" onClick={onConfirm} loading={isSubmitting} autoFocus>
            Confirmar Venda
          </Button>
        </>
      }
    >
      <div className={styles.root}>
        <p className={styles.eyebrow}>Fechamento rapido</p>
        <p className={styles.description}>
          Revise o resumo e confirme o envio do pedido para o backend do Aroma Sabor OS.
        </p>

        <div className={styles.summary}>
          <div className={styles.summaryCard}>
            <span className={styles.label}>Itens</span>
            <strong>{totalItems}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.label}>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
        </div>

        <p className={styles.footnote}>Atalho: pressione ESC para voltar ao carrinho.</p>
      </div>
    </Modal>
  )
}