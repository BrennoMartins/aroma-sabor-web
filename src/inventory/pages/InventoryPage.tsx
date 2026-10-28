import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { useInactiveProducts, useProducts } from '../../product/hooks/useProducts'
import type { ProductRecord } from '../../product/services/productApi'
import { Button } from '../../shared/components/Button/Button'
import { Card } from '../../shared/components/Card/Card'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog'
import { Input } from '../../shared/components/Input/Input'
import { useAdjustStock, useReplenishStock } from '../hooks/useStockOperations'
import { useStockMovements } from '../hooks/useStockMovements'
import { acquireStockOperationLock, releaseStockOperationLock } from '../services/stockOperationLock'
import type { StockMovement, StockMovementFilters } from '../services/stockMovementApi'
import styles from './InventoryPage.module.css'

const positiveInteger = z
  .string()
  .trim()
  .min(1, 'Informe uma quantidade.')
  .regex(/^[1-9]\d*$/, 'Informe um número inteiro maior que zero.')
  .transform(Number)
  .refine(Number.isSafeInteger, 'A quantidade informada é muito alta.')

const nonNegativeInteger = z
  .string()
  .trim()
  .min(1, 'Informe a quantidade física.')
  .regex(/^\d+$/, 'Informe um número inteiro maior ou igual a zero.')
  .transform(Number)
  .refine(Number.isSafeInteger, 'A quantidade informada é muito alta.')

const replenishmentSchema = z.object({
  productId: z.string().min(1, 'Selecione um produto.').transform(Number),
  quantity: positiveInteger,
  reason: z.string().max(255, 'A observação deve ter no máximo 255 caracteres.'),
})

const adjustmentSchema = z.object({
  productId: z.string().min(1, 'Selecione um produto.').transform(Number),
  quantityOnHand: nonNegativeInteger,
  justification: z
    .string()
    .trim()
    .min(1, 'Informe uma justificativa.')
    .max(255, 'A justificativa deve ter no máximo 255 caracteres.'),
})

type ReplenishmentFormValues = z.output<typeof replenishmentSchema>
type AdjustmentFormValues = z.output<typeof adjustmentSchema>
type MovementType = StockMovement['movementType']
type MovementFiltersState = {
  productId: string
  movementType: MovementType | ''
  startDate: string
  endDate: string
}

const movementLabels: Record<MovementType, string> = {
  SALE: 'Venda',
  ENTRY: 'Reposição',
  ADJUSTMENT: 'Ajuste',
  DISCARD: 'Perda/descarte',
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

function toApiFilters(filters: MovementFiltersState, page: number): StockMovementFilters {
  return {
    productId: filters.productId ? Number(filters.productId) : undefined,
    movementType: filters.movementType || undefined,
    startDate: filters.startDate ? `${filters.startDate}T00:00:00` : undefined,
    endDate: filters.endDate ? `${filters.endDate}T23:59:59.999999` : undefined,
    page,
    size: 20,
  }
}

function ProductSelect({
  id,
  label,
  products,
  value,
  onChange,
  disabled,
  error,
}: {
  id: string
  label: string
  products: ProductRecord[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <option value="">Selecione um produto</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name} — estoque: {product.stockQuantity}
          </option>
        ))}
      </select>
      {error ? <span id={`${id}-error`} className={styles.error} role="alert">{error}</span> : null}
    </div>
  )
}

function ProductQueryStatus({ query }: { query: ReturnType<typeof useProducts> }) {
  if (query.isPending) {
    return <p className={styles.status} role="status" aria-busy="true">Carregando produtos...</p>
  }
  if (query.isError) {
    return (
      <div className={styles.message} role="alert">
        <span>Não foi possível carregar os produtos para as operações de estoque.</span>
        <Button type="button" variant="secondary" onClick={() => void query.refetch()}>Tentar novamente</Button>
      </div>
    )
  }
  if (!query.data.length) {
    return <p className={styles.status} role="status">Cadastre um produto ativo para operar o estoque.</p>
  }
  return null
}

function MovementHistory({ products }: { products: ProductRecord[] }) {
  const [filters, setFilters] = useState<MovementFiltersState>({
    productId: '',
    movementType: '',
    startDate: '',
    endDate: '',
  })
  const [page, setPage] = useState(0)
  const invalidDateRange = Boolean(filters.startDate && filters.endDate && filters.endDate < filters.startDate)
  const historyQuery = useStockMovements(toApiFilters(filters, page), !invalidDateRange)

  const updateFilter = <K extends keyof MovementFiltersState>(key: K, value: MovementFiltersState[K]) => {
    setPage(0)
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({ productId: '', movementType: '', startDate: '', endDate: '' })
    setPage(0)
  }

  const totalPages = historyQuery.data?.totalPages ?? 0
  const currentPage = historyQuery.data?.number ?? page

  return (
    <Card title="Histórico de movimentações" className={styles.card}>
      <div className={styles.filters} aria-label="Filtros do histórico de estoque">
        <div className={styles.field}>
          <label className={styles.label} htmlFor="movement-product-filter">Produto</label>
          <select
            id="movement-product-filter"
            className={styles.select}
            value={filters.productId}
            onChange={(event) => updateFilter('productId', event.target.value)}
          >
            <option value="">Todos os produtos</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="movement-type-filter">Tipo de movimentação</label>
          <select
            id="movement-type-filter"
            className={styles.select}
            value={filters.movementType}
            onChange={(event) => updateFilter('movementType', event.target.value as MovementType | '')}
          >
            <option value="">Todos os tipos</option>
            <option value="SALE">Venda</option>
            <option value="ENTRY">Reposição</option>
            <option value="ADJUSTMENT">Ajuste</option>
            <option value="DISCARD">Perda/descarte</option>
          </select>
        </div>
        <Input
          label="Data inicial"
          name="movement-start-date"
          type="date"
          value={filters.startDate}
          onChange={(event) => updateFilter('startDate', event.target.value)}
          aria-invalid={invalidDateRange}
        />
        <Input
          label="Data final"
          name="movement-end-date"
          type="date"
          value={filters.endDate}
          min={filters.startDate || undefined}
          onChange={(event) => updateFilter('endDate', event.target.value)}
          error={invalidDateRange ? 'A data final não pode ser anterior à data inicial.' : undefined}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!filters.productId && !filters.movementType && !filters.startDate && !filters.endDate}
          onClick={clearFilters}
        >
          Limpar filtros
        </Button>
      </div>

      {invalidDateRange ? (
        <p className={styles.status} role="status">Corrija o intervalo de datas para consultar o histórico.</p>
      ) : historyQuery.isPending ? (
        <p className={styles.status} role="status" aria-busy="true">Carregando movimentações...</p>
      ) : historyQuery.isError ? (
        <div className={styles.message} role="alert">
          <span>Não foi possível carregar o histórico de movimentações.</span>
          <Button type="button" variant="secondary" onClick={() => void historyQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : historyQuery.data.empty ? (
        <p className={styles.status} role="status">Não há movimentações para os filtros selecionados.</p>
      ) : (
        <>
          <div className={styles.tableWrapper} aria-busy={historyQuery.isFetching}>
            <table className={styles.table}>
              <caption className={styles.caption}>
                {historyQuery.data.totalElements} movimentações registradas
              </caption>
              <thead>
                <tr>
                  <th scope="col">Data e hora</th>
                  <th scope="col">Produto</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Quantidade</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Venda</th>
                </tr>
              </thead>
              <tbody>
                {historyQuery.data.content.map((movement) => (
                  <tr key={movement.id}>
                    <td>{formatDateTime(movement.createdAt)}</td>
                    <th scope="row">{movement.productName}</th>
                    <td>{movementLabels[movement.movementType]}</td>
                    <td>{movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}</td>
                    <td>{movement.reason || '—'}</td>
                    <td>{movement.referenceSaleId ? `#${movement.referenceSaleId}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination} aria-label="Paginação do histórico">
            <span>Página {currentPage + 1} de {Math.max(totalPages, 1)}</span>
            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={currentPage === 0 || historyQuery.isFetching}
                onClick={() => setPage(currentPage - 1)}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={currentPage + 1 >= totalPages || historyQuery.isFetching}
                onClick={() => setPage(currentPage + 1)}
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

export function InventoryPage() {
  const productsQuery = useProducts()
  const inactiveProductsQuery = useInactiveProducts()
  const replenishMutation = useReplenishStock()
  const adjustMutation = useAdjustStock()
  const [pendingAdjustment, setPendingAdjustment] = useState<AdjustmentFormValues | null>(null)
  const products = productsQuery.data ?? []
  const allProducts = [...products, ...(inactiveProductsQuery.data ?? [])]
  const productName = (id: number) => products.find((product) => product.id === id)?.name ?? 'Produto'

  const replenishmentForm = useForm<z.input<typeof replenishmentSchema>, unknown, ReplenishmentFormValues>({
    resolver: zodResolver(replenishmentSchema),
    defaultValues: { productId: '', quantity: '', reason: '' },
  })
  const adjustmentForm = useForm<z.input<typeof adjustmentSchema>, unknown, AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { productId: '', quantityOnHand: '', justification: '' },
  })
  const replenishmentProductId = useWatch({ control: replenishmentForm.control, name: 'productId' })
  const adjustmentProductId = useWatch({ control: adjustmentForm.control, name: 'productId' })
  const submitReplenishment = (values: ReplenishmentFormValues) => {
    const lockKey = `replenishment:${values.productId}`
    if (replenishMutation.isPending || !acquireStockOperationLock(lockKey)) {
      return
    }
    replenishMutation.mutate(
      {
        id: values.productId,
        payload: { quantity: values.quantity, reason: values.reason.trim() || undefined },
      },
      {
        onSuccess: () => replenishmentForm.reset(),
        onSettled: () => releaseStockOperationLock(lockKey),
      },
    )
  }

  const submitAdjustment = (values: AdjustmentFormValues) => {
    setPendingAdjustment(values)
  }

  const confirmAdjustment = () => {
    if (!pendingAdjustment || adjustMutation.isPending) {
      return
    }
    const lockKey = `adjustment:${pendingAdjustment.productId}`
    if (!acquireStockOperationLock(lockKey)) {
      return
    }
    adjustMutation.mutate(
      {
        id: pendingAdjustment.productId,
        payload: {
          quantityOnHand: pendingAdjustment.quantityOnHand,
          reason: pendingAdjustment.justification.trim(),
        },
      },
      {
        onSuccess: () => {
          setPendingAdjustment(null)
          adjustmentForm.reset()
        },
        onSettled: () => releaseStockOperationLock(lockKey),
      },
    )
  }

  return (
    <section className={styles.page}>
      <div className={styles.operations}>
        <Card title="Reposição de estoque" className={styles.card}>
          <p className={styles.description}>Informe quanto será acrescentado ao saldo atual.</p>
          <ProductQueryStatus query={productsQuery} />
          {products.length ? (
            <form id="inventory-replenishment-form" className={styles.form} onSubmit={replenishmentForm.handleSubmit(submitReplenishment)}>
              <ProductSelect
                id="replenishment-product"
                label="Produto"
                products={products}
                value={replenishmentProductId}
                onChange={(value) => replenishmentForm.setValue('productId', value, { shouldValidate: true })}
                disabled={replenishMutation.isPending}
                error={replenishmentForm.formState.errors.productId?.message}
              />
              <Input
                label="Quantidade a acrescentar"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                {...replenishmentForm.register('quantity')}
                error={replenishmentForm.formState.errors.quantity?.message}
              />
              <Input
                label="Observação (opcional)"
                maxLength={255}
                {...replenishmentForm.register('reason')}
                error={replenishmentForm.formState.errors.reason?.message}
              />
              <Button type="submit" loading={replenishMutation.isPending}>
                Registrar reposição
              </Button>
            </form>
          ) : null}
        </Card>

        <Card title="Ajuste manual de estoque" className={styles.card}>
          <p className={styles.description}>
            A quantidade informada é o saldo físico final, não a quantidade a acrescentar ou retirar.
          </p>
          <ProductQueryStatus query={productsQuery} />
          {products.length ? (
            <form id="inventory-adjustment-form" className={styles.form} onSubmit={adjustmentForm.handleSubmit(submitAdjustment)}>
              <ProductSelect
                id="adjustment-product"
                label="Produto"
                products={products}
                value={adjustmentProductId}
                onChange={(value) => adjustmentForm.setValue('productId', value, { shouldValidate: true })}
                disabled={adjustMutation.isPending}
                error={adjustmentForm.formState.errors.productId?.message}
              />
              <Input
                label="Quantidade física final"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                {...adjustmentForm.register('quantityOnHand')}
                error={adjustmentForm.formState.errors.quantityOnHand?.message}
              />
              <Input
                label="Justificativa"
                maxLength={255}
                {...adjustmentForm.register('justification')}
                error={adjustmentForm.formState.errors.justification?.message}
              />
              <Button type="submit" loading={adjustMutation.isPending}>
                Conferir ajuste
              </Button>
            </form>
          ) : null}
        </Card>
      </div>

      <MovementHistory products={allProducts} />

      <ConfirmDialog
        open={Boolean(pendingAdjustment)}
        title="Confirmar ajuste de estoque"
        description={
          pendingAdjustment
            ? `${productName(pendingAdjustment.productId)} ficará com saldo final de ${pendingAdjustment.quantityOnHand} unidades. A operação será registrada no histórico.`
            : ''
        }
        confirmLabel="Confirmar ajuste"
        confirmingLabel="Salvando ajuste..."
        isConfirming={adjustMutation.isPending}
        onConfirm={confirmAdjustment}
        onCancel={() => {
          if (!adjustMutation.isPending) {
            setPendingAdjustment(null)
          }
        }}
      />
    </section>
  )
}
