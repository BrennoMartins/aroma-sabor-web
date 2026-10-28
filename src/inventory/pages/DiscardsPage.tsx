import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { useProducts } from '../../product/hooks/useProducts'
import {
  STOCK_DISCARD_REASONS,
  type ProductRecord,
  type StockDiscardReason,
  type StockDiscardResponse,
} from '../../product/services/productApi'
import { Button } from '../../shared/components/Button/Button'
import { Card } from '../../shared/components/Card/Card'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog'
import { Input } from '../../shared/components/Input/Input'
import { useDiscardStock } from '../hooks/useStockOperations'
import { useStockMovements } from '../hooks/useStockMovements'
import { acquireStockOperationLock, releaseStockOperationLock } from '../services/stockOperationLock'
import { getInventoryErrorMessage } from '../services/inventoryErrorMessage'
import type { StockMovement } from '../services/stockMovementApi'
import styles from './DiscardsPage.module.css'

const positiveInteger = z
  .string()
  .trim()
  .min(1, 'Informe uma quantidade.')
  .regex(/^[1-9]\d*$/, 'Informe um número inteiro maior que zero.')
  .transform(Number)
  .refine(Number.isSafeInteger, 'A quantidade informada é muito alta.')

const discardSchema = z.object({
  productId: z.string().min(1, 'Selecione um produto.').transform(Number),
  quantity: positiveInteger,
  reason: z.string().refine(
    (value): value is StockDiscardReason =>
      STOCK_DISCARD_REASONS.includes(value as StockDiscardReason),
    'Selecione um motivo válido.',
  ),
  observation: z
    .string()
    .max(255, 'A observação deve ter no máximo 255 caracteres.')
    .transform((value) => value.trim() || undefined),
})

type DiscardFormValues = z.output<typeof discardSchema>
type PendingDiscard = { values: DiscardFormValues; product: ProductRecord }

const reasonLabels: Record<StockDiscardReason, string> = {
  DAMAGED: 'Produto danificado',
  EXPIRED: 'Produto vencido',
  UNFIT_FOR_SALE: 'Impróprio para venda',
  OTHER: 'Outro',
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Data indisponível' : dateTimeFormatter.format(date)
}

function formatReason(reason: string | null | undefined) {
  return reason && reason in reasonLabels
    ? reasonLabels[reason as StockDiscardReason]
    : 'Motivo não disponível'
}

function DiscardHistory() {
  const [page, setPage] = useState(0)
  const historyQuery = useStockMovements({ movementType: 'DISCARD', page, size: 20 })

  return (
    <Card title="Histórico de perdas e descartes">
      {historyQuery.isPending ? (
        <p className={styles.status} role="status" aria-busy="true">Carregando descartes...</p>
      ) : historyQuery.isError ? (
        <div className={styles.message} role="alert">
          <span>Não foi possível carregar o histórico de descartes.</span>
          <Button type="button" variant="secondary" onClick={() => void historyQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : historyQuery.data.empty ? (
        <p className={styles.status} role="status">Ainda não há descartes registrados.</p>
      ) : (
        <>
          <div className={styles.tableWrapper} aria-busy={historyQuery.isFetching}>
            <table className={styles.table}>
              <caption className={styles.caption}>
                {historyQuery.data.totalElements} descartes registrados
              </caption>
              <thead>
                <tr>
                  <th scope="col">Data e hora</th>
                  <th scope="col">Produto</th>
                  <th scope="col">Quantidade</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Observação</th>
                </tr>
              </thead>
              <tbody>
                {historyQuery.data.content.map((movement: StockMovement) => (
                  <tr key={movement.id}>
                    <td>{formatDateTime(movement.createdAt)}</td>
                    <th scope="row">{movement.productName}</th>
                    <td>{Math.abs(movement.quantity)}</td>
                    <td>{formatReason(movement.discardReason)}</td>
                    <td>{movement.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination} aria-label="Paginação do histórico de descartes">
            <span>Página {historyQuery.data.number + 1} de {Math.max(historyQuery.data.totalPages, 1)}</span>
            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={historyQuery.data.first || historyQuery.isFetching}
                onClick={() => setPage(historyQuery.data.number - 1)}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={historyQuery.data.last || historyQuery.isFetching}
                onClick={() => setPage(historyQuery.data.number + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

export function DiscardsPage() {
  const productsQuery = useProducts()
  const discardMutation = useDiscardStock()
  const [search, setSearch] = useState('')
  const [pendingDiscard, setPendingDiscard] = useState<PendingDiscard | null>(null)
  const [completedDiscard, setCompletedDiscard] = useState<StockDiscardResponse | null>(null)
  const products = productsQuery.data ?? []

  const form = useForm<z.input<typeof discardSchema>, unknown, DiscardFormValues>({
    resolver: zodResolver(discardSchema),
    defaultValues: { productId: '', quantity: '', reason: '', observation: '' },
  })
  const selectedProductId = useWatch({ control: form.control, name: 'productId' })
  const selectedProduct = products.find((product) => String(product.id) === selectedProductId)
  const visibleProducts = products.filter((product) => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    return !query || product.name.toLocaleLowerCase('pt-BR').includes(query) || product.barcode.includes(query)
  })

  const submitDiscard = (values: DiscardFormValues) => {
    const product = products.find((item) => item.id === values.productId)
    if (!product) {
      form.setError('productId', { message: 'Selecione um produto ativo.' })
      return
    }
    if (values.quantity > product.stockQuantity) {
      form.setError('quantity', { message: 'A quantidade não pode ser maior que o estoque disponível.' })
      return
    }
    setCompletedDiscard(null)
    setPendingDiscard({ values, product })
  }

  const confirmDiscard = () => {
    if (!pendingDiscard || discardMutation.isPending) {
      return
    }

    const { values, product } = pendingDiscard
    const lockKey = `discard:${product.id}`
    if (!acquireStockOperationLock(lockKey)) {
      return
    }

    discardMutation.mutate(
      {
        id: product.id,
        payload: {
          quantity: values.quantity,
          reason: values.reason,
          observation: values.observation,
        },
      },
      {
        onSuccess: (movement) => {
          setCompletedDiscard(movement)
          setPendingDiscard(null)
          form.reset()
          setSearch('')
        },
        onSettled: () => releaseStockOperationLock(lockKey),
      },
    )
  }

  return (
    <section className={styles.page}>
      <Card title="Registrar perda ou descarte">
        <p className={styles.description}>
          Registre a retirada de produtos danificados, vencidos ou impróprios para venda. O estoque e o histórico são atualizados juntos.
        </p>

        {productsQuery.isPending ? (
          <p className={styles.status} role="status" aria-busy="true">Carregando produtos...</p>
        ) : productsQuery.isError ? (
          <div className={styles.message} role="alert">
            <span>Não foi possível carregar os produtos.</span>
            <Button type="button" variant="secondary" onClick={() => void productsQuery.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : products.length === 0 ? (
          <p className={styles.status} role="status">Não há produtos ativos para descartar.</p>
        ) : (
          <form id="stock-discard-form" className={styles.form} onSubmit={form.handleSubmit(submitDiscard)}>
            <Input
              label="Pesquisar produto por nome ou código de barras"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={discardMutation.isPending}
              autoComplete="off"
            />
            <div className={styles.field}>
              <label className={styles.label} htmlFor="discard-product">Produto</label>
              <select
                id="discard-product"
                className={styles.select}
                value={selectedProductId}
                onChange={(event) => form.setValue('productId', event.target.value, { shouldValidate: true })}
                disabled={discardMutation.isPending}
                aria-invalid={Boolean(form.formState.errors.productId)}
                aria-describedby={form.formState.errors.productId ? 'discard-product-error' : undefined}
              >
                <option value="">Selecione um produto</option>
                {visibleProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — estoque: {product.stockQuantity}
                  </option>
                ))}
              </select>
              {form.formState.errors.productId ? (
                <span id="discard-product-error" className={styles.error} role="alert">
                  {form.formState.errors.productId.message}
                </span>
              ) : null}
              {visibleProducts.length === 0 ? (
                <span className={styles.status} role="status">Nenhum produto corresponde à pesquisa.</span>
              ) : null}
            </div>

            {selectedProduct ? (
              <div className={styles.productDetails} aria-live="polite">
                <strong>{selectedProduct.name}</strong>
                <span>Código de barras: {selectedProduct.barcode}</span>
                <span>Estoque atual: {selectedProduct.stockQuantity} unidades</span>
              </div>
            ) : null}

            <Input
              label="Quantidade a descartar"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              disabled={discardMutation.isPending || !selectedProduct}
              {...form.register('quantity')}
              error={form.formState.errors.quantity?.message}
            />
            <div className={styles.field}>
              <label className={styles.label} htmlFor="discard-reason">Motivo</label>
              <select
                id="discard-reason"
                className={styles.select}
                disabled={discardMutation.isPending}
                aria-invalid={Boolean(form.formState.errors.reason)}
                {...form.register('reason')}
              >
                <option value="">Selecione um motivo</option>
                {STOCK_DISCARD_REASONS.map((reason) => (
                  <option key={reason} value={reason}>{reasonLabels[reason]}</option>
                ))}
              </select>
              {form.formState.errors.reason ? (
                <span className={styles.error} role="alert">Selecione um motivo válido.</span>
              ) : null}
            </div>
            <Input
              label="Observação (opcional)"
              maxLength={255}
              disabled={discardMutation.isPending}
              {...form.register('observation')}
              error={form.formState.errors.observation?.message}
            />
            <Button type="submit" variant="danger" loading={discardMutation.isPending}>
              Conferir descarte
            </Button>
            {discardMutation.isError ? (
              <p className={styles.error} role="alert">
                {getInventoryErrorMessage(discardMutation.error, 'discard')}
              </p>
            ) : null}
          </form>
        )}
      </Card>

      {completedDiscard ? (
        <p className={styles.success} role="status" aria-live="polite">
          Descarte #{completedDiscard.id} registrado: {completedDiscard.productName}, {Math.abs(completedDiscard.quantity)} unidade(s),
          {' '}{formatReason(completedDiscard.discardReason)}.
        </p>
      ) : null}

      <DiscardHistory />

      <ConfirmDialog
        open={Boolean(pendingDiscard)}
        title="Confirmar descarte"
        description={
          pendingDiscard
            ? `${pendingDiscard.product.name}: descartar ${pendingDiscard.values.quantity} unidade(s) por motivo "${reasonLabels[pendingDiscard.values.reason]}".${pendingDiscard.values.observation ? ` Observação: ${pendingDiscard.values.observation}.` : ''} Esta operação reduzirá o estoque e será registrada no histórico.`
            : ''
        }
        confirmLabel="Confirmar descarte"
        confirmingLabel="Registrando descarte..."
        confirmVariant="danger"
        isConfirming={discardMutation.isPending}
        onConfirm={confirmDiscard}
        onCancel={() => {
          if (!discardMutation.isPending) {
            setPendingDiscard(null)
          }
        }}
      />
    </section>
  )
}
