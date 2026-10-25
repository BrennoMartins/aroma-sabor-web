import { Button } from '../../shared/components/Button/Button'
import { Modal } from '../../shared/components/Modal/Modal'
import { ProductCard } from './ProductCard'
import type { ProductRecord } from '../services/productApi'

type StockRestockModalProps = {
  open: boolean
  product: ProductRecord | null
  onClose: () => void
}

export function StockRestockModal({ open, product, onClose }: StockRestockModalProps) {
  return (
    <Modal
      open={open}
      title="Reposição indisponível"
      onClose={onClose}
      actions={
        <Button variant="secondary" type="button" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {product ? <ProductCard product={product} /> : null}
      <p role="status">
        O backend ainda não oferece uma operação para registrar entradas de estoque. Nenhuma alteração foi realizada.
      </p>
    </Modal>
  )
}
