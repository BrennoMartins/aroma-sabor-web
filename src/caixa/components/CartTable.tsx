import type { CartItem } from '../hooks/useCart'
import { CartItem as CartItemRow } from './CartItem'
import { Card } from '../../shared/components/Card/Card'

type CartTableProps = {
  items: CartItem[]
  onIncrement: (productId: number) => void
  onDecrement: (productId: number) => void
  onRemove: (productId: number) => void
}

export function CartTable({ items, onIncrement, onDecrement, onRemove }: CartTableProps) {
  if (items.length === 0) {
    return (
      <Card title="Carrinho" className="cart-table cart-table--empty">
        <p className="empty-state">Passe o primeiro produto.</p>
      </Card>
    )
  }

  return (
    <Card title="Carrinho" className="cart-table">

      <div className="cart-table__header" role="row">
        <span>Produto</span>
        <span>Quantidade</span>
        <span>Preco</span>
        <span>Subtotal</span>
        <span>Acoes</span>
      </div>

      <div className="cart-table__body">
        {items.map((item) => (
          <CartItemRow
            key={item.productId}
            item={item}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
            onRemove={onRemove}
          />
        ))}
      </div>
    </Card>
  )
}