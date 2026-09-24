import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../shared/components/Button/Button'
import type { CartItem as CartLineItem } from '../hooks/useCart'

type CartItemProps = {
  item: CartLineItem
  onIncrement: (productId: number) => void
  onDecrement: (productId: number) => void
  onRemove: (productId: number) => void
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function CartItem({ item, onIncrement, onDecrement, onRemove }: CartItemProps) {
  return (
    <article className="cart-row">
      <div>
        <strong className="cart-row__name">{item.name}</strong>
        <span className="cart-row__meta">Codigo: {item.barcode}</span>
      </div>

      <div className="cart-quantity">
        <Button variant="secondary" className="cart-quantity__button" onClick={() => onDecrement(item.productId)} icon={<Minus size={14} />}>
          <span className="sr-only">Diminuir</span>
        </Button>
        <span className="cart-quantity__value">{item.quantity}</span>
        <Button variant="secondary" className="cart-quantity__button" onClick={() => onIncrement(item.productId)} icon={<Plus size={14} />}>
          <span className="sr-only">Aumentar</span>
        </Button>
      </div>

      <span>{formatCurrency(item.price)}</span>
      <strong>{formatCurrency(item.price * item.quantity)}</strong>

      <Button type="button" variant="danger" className="cart-row__remove" icon={<Trash2 size={14} />} onClick={() => onRemove(item.productId)}>
        Remover
      </Button>
    </article>
  )
}