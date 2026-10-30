import { ShoppingBasket } from 'lucide-react'
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
          <ShoppingBasket className={styles.emptyIcon} size={30} aria-hidden="true" />
          <p className={styles.emptyTitle}>Carrinho vazio</p>
          <p className={styles.emptyDescription}>
            Pressione F2 para adicionar um produto ou use o leitor de código de barras.
          </p>
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

      <div className={styles.body} role="rowgroup">
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