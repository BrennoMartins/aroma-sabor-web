import { useState } from 'react'
import { Button } from '../../shared/components/Button/Button'
import { Input } from '../../shared/components/Input/Input'
import { Modal } from '../../shared/components/Modal/Modal'
import { ProductCard } from './ProductCard'
import type { ProductRecord } from '../services/productApi'

type StockRestockModalProps = {
  open: boolean
  product: ProductRecord | null
  onClose: () => void
  onConfirm: (quantity: number) => void
}

export function StockRestockModal({ open, product, onClose, onConfirm }: StockRestockModalProps) {
  const [quantity, setQuantity] = useState('1')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleConfirm = () => {
    const parsed = Number(quantity)

    if (!Number.isInteger(parsed) || parsed <= 0) {
      setErrorMessage('Informe uma quantidade inteira maior que zero.')
      return
    }

    setErrorMessage(null)
    onConfirm(parsed)
  }

  return (
    <Modal
      open={open}
      title="Reposicao de estoque"
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="button" onClick={handleConfirm}>
            Repor
          </Button>
        </>
      }
    >
      {product ? <ProductCard product={product} /> : null}

      <div className="product-restock-field">
        <Input
          label="Quantidade para reposicao"
          inputMode="numeric"
          value={quantity}
          onChange={(event) => {
            setQuantity(event.target.value)

            if (errorMessage) {
              setErrorMessage(null)
            }
          }}
          error={errorMessage ?? undefined}
        />
      </div>
    </Modal>
  )
}
