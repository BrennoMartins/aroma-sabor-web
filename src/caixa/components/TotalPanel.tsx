import { Card } from '../../shared/components/Card/Card'

type TotalPanelProps = {
  total: number
  totalItems: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function TotalPanel({ total, totalItems }: TotalPanelProps) {
  return (
    <Card title="Resumo" className="total-panel">

      <div className="total-panel__metric">
        <span className="total-panel__label">Total</span>
        <strong className="total-panel__amount">{formatCurrency(total)}</strong>
      </div>

      <div className="total-panel__metric">
        <span className="total-panel__label">Itens</span>
        <strong className="total-panel__count">{totalItems}</strong>
      </div>

      <div className="shortcut-list">
        <div className="shortcut-list__item">
          <span>F9</span>
          <strong>Finalizar</strong>
        </div>
        <div className="shortcut-list__item">
          <span>ESC</span>
          <strong>Cancelar</strong>
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
    </Card>
  )
}