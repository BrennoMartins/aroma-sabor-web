import { Minus, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../shared/components/Button/Button'
import type { CartItem as CartLineItem } from '../hooks/useCart'
import styles from './CartItem.module.css'

type CartItemProps = {
  item: CartLineItem
  onIncrement: (productId: number) => void
  onDecrement: (productId: number) => void
  onRemove: (productId: number) => void
  onEditPrice: (productId: number) => void
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function CartItem({ item, onIncrement, onDecrement, onRemove, onEditPrice }: CartItemProps) {
  return (
    <article className={styles.row}>
      <div>
        <strong className={styles.name}>{item.name}</strong>
        <span className={styles.meta}>Codigo: {item.barcode}</span>
      </div>

      <div className={styles.quantity}>
        <Button variant="secondary" className={styles.quantityButton} onClick={() => onDecrement(item.productId)} icon={<Minus size={14} />}>
          <span className="sr-only">Diminuir</span>
        </Button>
        <span className={styles.quantityValue}>{item.quantity}</span>
        <Button variant="secondary" className={styles.quantityButton} onClick={() => onIncrement(item.productId)} icon={<Plus size={14} />}>
          <span className="sr-only">Aumentar</span>
        </Button>
      </div>

      <div className={styles.priceBlock}>
        <span className={styles.value}>{formatCurrency(item.price)}</span>
        {item.price !== item.catalogPrice ? (
          <span className={styles.negotiated}>Negociado (cadastro: {formatCurrency(item.catalogPrice)})</span>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          className={styles.editPriceButton}
          icon={<Pencil size={14} />}
          onClick={() => onEditPrice(item.productId)}
        >
          <span className="sr-only">Editar preco de {item.name}</span>
          <span aria-hidden="true">Preco</span>
        </Button>
      </div>
      <strong className={styles.subtotal}>{formatCurrency(item.price * item.quantity)}</strong>

      <Button type="button" variant="danger" className={styles.removeButton} icon={<Trash2 size={14} />} onClick={() => onRemove(item.productId)}>
        Remover
      </Button>
    </article>
  )
}