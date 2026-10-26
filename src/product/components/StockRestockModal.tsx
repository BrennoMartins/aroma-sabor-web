import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useReplenishStock } from '../../inventory/hooks/useStockOperations'
import { getInventoryErrorMessage } from '../../inventory/services/inventoryErrorMessage'
import { acquireStockOperationLock, releaseStockOperationLock } from '../../inventory/services/stockOperationLock'
import { Button } from '../../shared/components/Button/Button'
import { Input } from '../../shared/components/Input/Input'
import { Modal } from '../../shared/components/Modal/Modal'
import type { ProductRecord } from '../services/productApi'
import { ProductCard } from './ProductCard'

type StockRestockModalProps = {
  open: boolean
  product: ProductRecord | null
  onClose: () => void
}

const restockSchema = z.object({
  quantity: z
    .string()
    .trim()
    .min(1, 'Informe uma quantidade.')
    .regex(/^[1-9]\d*$/, 'Informe um número inteiro maior que zero.')
    .transform(Number)
    .refine(Number.isSafeInteger, 'A quantidade informada é muito alta.'),
  reason: z.string().max(255, 'A observação deve ter no máximo 255 caracteres.'),
})

type RestockFormValues = z.output<typeof restockSchema>

export function StockRestockModal({ open, product, onClose }: StockRestockModalProps) {
  const mutation = useReplenishStock()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof restockSchema>, unknown, RestockFormValues>({
    resolver: zodResolver(restockSchema),
    defaultValues: { quantity: '', reason: '' },
  })

  const submitRestock = (values: RestockFormValues) => {
    if (!product || mutation.isPending) {
      return
    }
    const lockKey = `replenishment:${product.id}`
    if (!acquireStockOperationLock(lockKey)) {
      return
    }

    mutation.mutate(
      {
        id: product.id,
        payload: { quantity: values.quantity, reason: values.reason.trim() || undefined },
      },
      {
        onSuccess: () => {
          reset()
          onClose()
        },
        onSettled: () => releaseStockOperationLock(lockKey),
      },
    )
  }

  return (
    <Modal
      open={open}
      title="Reposição de estoque"
      onClose={mutation.isPending ? () => undefined : onClose}
      actions={
        <>
          <Button variant="secondary" type="button" disabled={mutation.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="success"
            type="submit"
            form="product-restock-form"
            loading={mutation.isPending}
            disabled={!product}
          >
            Registrar reposição
          </Button>
        </>
      }
    >
      {product ? (
        <>
          <ProductCard product={product} />
          <form id="product-restock-form" onSubmit={handleSubmit(submitRestock)}>
            <Input
              label="Quantidade a acrescentar"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              {...register('quantity')}
              error={errors.quantity?.message}
            />
            <Input
              label="Observação (opcional)"
              maxLength={255}
              {...register('reason')}
              error={errors.reason?.message}
            />
          </form>
          {mutation.isError ? (
            <p role="alert">{getInventoryErrorMessage(mutation.error, 'replenishment')}</p>
          ) : null}
        </>
      ) : (
        <p role="status">Selecione um produto ativo para registrar a reposição.</p>
      )}
    </Modal>
  )
}
