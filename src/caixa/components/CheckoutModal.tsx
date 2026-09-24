import { Button } from '../../shared/components/Button/Button'
import { Modal } from '../../shared/components/Modal/Modal'

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
      title="Fechar atendimento"
      onClose={onCancel}
      actions={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="success" onClick={onConfirm} loading={isSubmitting}>
            Confirmar Venda
          </Button>
        </>
      }
    >
      <div className="checkout-modal"
      >
        <p className="checkout-modal__eyebrow">Confirmacao de venda</p>
        <p className="checkout-modal__description">
          Revise os itens e confirme o envio da venda para o backend.
        </p>

        <div className="checkout-modal__summary">
          <div>
            <span className="checkout-modal__label">Itens</span>
            <strong>{totalItems}</strong>
          </div>
          <div>
            <span className="checkout-modal__label">Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
        </div>

        <div className="payment-placeholder">
          <span className="payment-placeholder__label">Pagamentos</span>
          <div className="payment-placeholder__chips">
            <span className="payment-chip">Dinheiro</span>
            <span className="payment-chip">Cartao</span>
            <span className="payment-chip">PIX</span>
          </div>
        </div>

      </div>
    </Modal>
  )
}