import type { CartItem } from '../hooks/useCart'
import { CartItem as CartItemRow } from './CartItem'
import { Card } from '../../shared/components/Card/Card'
import styles from './CartTable.module.css'

type CartTableProps = {
  items: CartItem[]
  onIncrement: (productId: number) => void
  onDecrement: (productId: number) => void
  onRemove: (productId: number) => void
  onEditPrice: (productId: number) => void
}

export function CartTable({ items, onIncrement, onDecrement, onRemove, onEditPrice }: CartTableProps) {
  if (items.length === 0) {
    return (
      <Card title="Carrinho" className={styles.card}>
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Carrinho vazio</p>
          <p className={styles.emptyDescription}>Adicione produtos para iniciar a venda.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card title="Carrinho" className={styles.card}>
      <div className={styles.header} role="row">
        <span>Produto</span>
        <span>Quantidade</span>
        <span>Preco unitario</span>
        <span>Subtotal</span>
        <span>Acoes</span>
      </div>

      <div className={styles.body}>
        {items.map((item) => (
          <CartItemRow
            key={item.productId}
            item={item}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
            onRemove={onRemove}
            onEditPrice={onEditPrice}
          />
        ))}
      </div>
    </Card>
  )
}