import { useState } from 'react'
import { Banknote, ReceiptText, TrendingUp } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../shared/components/Badge/Badge'
import { Button } from '../../shared/components/Button/Button'
import { Card } from '../../shared/components/Card/Card'
import { Input } from '../../shared/components/Input/Input'
import { useSaleDetails, useSalesHistory } from '../hooks/useSalesHistory'
import type { SaleRecord } from '../services/salesApi'
import styles from './SalesPage.module.css'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const quantityFormatter = new Intl.NumberFormat('pt-BR')

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

function formatStatus(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'Concluída'
    case 'PENDING':
      return 'Pendente'
    case 'CANCELLED':
      return 'Cancelada'
    default:
      return status
  }
}

function getTotalItems(sale: SaleRecord) {
  return sale.items.reduce((total, item) => total + item.quantity, 0)
}

function sumGrossProfitCents(sales: SaleRecord[]) {
  if (sales.some((sale) => sale.grossProfitKnownAmount === null)) {
    return null
  }

  const knownAmounts = sales
    .map((sale) => sale.grossProfitKnownAmount)
    .filter((amount): amount is number => amount !== null)

  return sumMoneyCents(knownAmounts)
}

function sumMoneyCents(values: number[]) {
  const cents = values.reduce((total, value) => total + Math.round(value * 100), 0)

  return cents / 100
}

function SalesMetric({
  label,
  value,
  icon: Icon,
  tone,
  note,
}: {
  label: string
  value: string
  icon: typeof Banknote
  tone: 'primary' | 'success' | 'warning'
  note?: string
}) {
  return (
    <Card className={styles.metricCard}>
      <div className={styles.metric}>
        <span className={`${styles.metricIcon} ${styles[tone]}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
        <span className={styles.metricLabel}>{label}</span>
        <strong className={styles.metricValue}>{value}</strong>
        {note ? <span className={styles.metricNote}>{note}</span> : null}
      </div>
    </Card>
  )
}

function formatGrossProfit(sale: SaleRecord) {
  if (sale.status !== 'COMPLETED') {
    return '—'
  }
  if (sale.grossProfitKnownAmount === null) {
    return 'Lucro indeterminado'
  }
  if (!sale.grossProfitComplete) {
    return `Incompleto (${currencyFormatter.format(sale.grossProfitKnownAmount)})`
  }
  return currencyFormatter.format(sale.grossProfitKnownAmount)
}

function formatHistoricalCurrency(value: number | null) {
  return value === null ? 'Não registrado' : currencyFormatter.format(value)
}

function SaleDetails({ saleId }: { saleId: string }) {
  const saleQuery = useSaleDetails(saleId)

  if (saleQuery.isPending) {
    return (
      <Card className={styles.card}>
        <p className={styles.status} role="status" aria-busy="true">Carregando detalhes da venda...</p>
      </Card>
    )
  }

  if (saleQuery.isError || !saleQuery.data) {
    return (
      <Card title="Detalhes da venda" className={styles.card}>
        <div className={styles.details}>
          <p className={styles.error} role="alert">Não foi possível carregar os detalhes desta venda.</p>
          <Button type="button" variant="secondary" onClick={() => void saleQuery.refetch()}>
            Tentar novamente
          </Button>
          <Link className={`${styles.link} ${styles.backLink}`} to="/sales">Voltar ao histórico</Link>
        </div>
      </Card>
    )
  }

  const sale = saleQuery.data

  return (
    <Card className={styles.card}>
      <div className={styles.details}>
        <Link className={`${styles.link} ${styles.backLink}`} to="/sales">Voltar ao histórico</Link>
        <header className={styles.detailsHeader}>
          <h2>Venda #{sale.id}</h2>
          <Badge variant={sale.status === 'COMPLETED' ? 'success' : 'neutral'}>
            {formatStatus(sale.status)}
          </Badge>
        </header>
        <dl className={styles.summary}>
          <div>
            <dt>Data e hora</dt>
            <dd>{formatDateTime(sale.createdAt)}</dd>
          </div>
          <div>
            <dt>Quantidade total de itens</dt>
            <dd>{quantityFormatter.format(getTotalItems(sale))}</dd>
          </div>
          {sale.subtotal !== undefined ? (
            <div>
              <dt>Subtotal</dt>
              <dd>{currencyFormatter.format(sale.subtotal)}</dd>
            </div>
          ) : null}
          {sale.discountAmount !== undefined ? (
            <div>
              <dt>Desconto geral</dt>
              <dd>
                {sale.discountAmount > 0
                  ? `− ${currencyFormatter.format(sale.discountAmount)}`
                  : currencyFormatter.format(0)}
              </dd>
            </div>
          ) : null}
          <div className={styles.totalHighlight}>
            <dt>Total final</dt>
            <dd>{currencyFormatter.format(sale.total)}</dd>
          </div>
          <div>
            <dt>Lucro bruto</dt>
            <dd>{formatGrossProfit(sale)}</dd>
          </div>
        </dl>
        {sale.status === 'COMPLETED' && sale.grossProfitKnownAmount === null ? (
          <p className={styles.profitNotice} role="status">
            Faltam dados históricos para calcular o lucro com segurança.
          </p>
        ) : sale.status === 'COMPLETED' && !sale.grossProfitComplete ? (
          <p className={styles.profitNotice} role="status">
            Lucro bruto incompleto: {sale.itemsWithoutHistoricalCost} item(ns) sem custo histórico.
          </p>
        ) : null}
        {sale.items.length ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <caption className={styles.notice}>Itens e valores registrados na venda</caption>
              <thead>
                <tr>
                  <th scope="col">Produto</th>
                  <th scope="col">Categoria histórica</th>
                  <th scope="col">Quantidade</th>
                  <th scope="col">Preço unitário praticado</th>
                  <th scope="col">Custo unitário histórico</th>
                  <th scope="col">Subtotal bruto</th>
                  <th scope="col">Desconto alocado</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, index) => (
                  <tr key={`${item.productId}-${index}`}>
                    <th scope="row">{item.productName ?? 'Produto sem nome histórico'}</th>
                    <td>{item.categoryName ?? 'Não registrada'}</td>
                    <td>{quantityFormatter.format(item.quantity)}</td>
                    <td>{currencyFormatter.format(item.unitPrice)}</td>
                    <td>{formatHistoricalCurrency(item.unitCostPrice)}</td>
                    <td>{currencyFormatter.format(item.subtotal)}</td>
                    <td>{formatHistoricalCurrency(item.discountAllocatedAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.empty}>Esta venda não possui itens informados.</p>
        )}
      </div>
    </Card>
  )
}

function SalesList() {
  const salesQuery = useSalesHistory()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const invalidDateRange = Boolean(startDate && endDate && endDate < startDate)

  const filteredSales = (salesQuery.data ?? []).filter((sale) => {
    const saleDate = sale.createdAt.slice(0, 10)

    return (!startDate || saleDate >= startDate) && (!endDate || saleDate <= endDate)
  })
  const completedSales = filteredSales.filter((sale) => sale.status === 'COMPLETED')
  const knownProfitTotal = sumGrossProfitCents(completedSales)
  const totalSalesAmount = sumMoneyCents(completedSales.map((sale) => sale.total))
  const salesCount = completedSales.length
  const missingCostItems = completedSales.reduce(
    (total, sale) => total + sale.itemsWithoutHistoricalCost,
    0,
  )
  const indicatorsAvailable = !invalidDateRange && !salesQuery.isPending && !salesQuery.isError
  const profitIsIndeterminate = indicatorsAvailable && knownProfitTotal === null
  const profitIsIncomplete = indicatorsAvailable && !profitIsIndeterminate && missingCostItems > 0
  const indicatorsValue = (value: string) => indicatorsAvailable ? value : '—'

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
  }

  return (
    <>
      <div className={styles.metrics} role="group" aria-label="Indicadores do período">
        <SalesMetric
          label="Valor total de vendas"
          value={indicatorsValue(currencyFormatter.format(totalSalesAmount))}
          icon={Banknote}
          tone="primary"
        />
        <SalesMetric
          label={indicatorsAvailable && missingCostItems ? 'Lucro bruto conhecido' : 'Lucro bruto'}
          value={!indicatorsAvailable
            ? '—'
            : knownProfitTotal === null
              ? 'Lucro indeterminado'
              : currencyFormatter.format(knownProfitTotal)}
          icon={TrendingUp}
          tone={profitIsIndeterminate || profitIsIncomplete ? 'warning' : 'success'}
          note={profitIsIndeterminate
            ? 'Dados históricos insuficientes para calcular com segurança.'
            : profitIsIncomplete
              ? `Incompleto · ${quantityFormatter.format(missingCostItems)} item(ns) sem custo histórico`
              : undefined}
        />
        <SalesMetric
          label="Quantidade de vendas"
          value={indicatorsValue(quantityFormatter.format(salesCount))}
          icon={ReceiptText}
          tone="warning"
        />
      </div>

      <Card title="Histórico de vendas" className={styles.card}>
        <div className={styles.filters} aria-label="Filtros do histórico de vendas">
          <Input
            label="Data inicial"
            name="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            aria-invalid={invalidDateRange}
          />
          <Input
            label="Data final"
            name="endDate"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => setEndDate(event.target.value)}
            error={invalidDateRange ? 'A data final não pode ser anterior à data inicial.' : undefined}
          />
          <div className={styles.filterActions}>
            <Button type="button" variant="secondary" disabled={!startDate && !endDate} onClick={clearFilters}>
              Limpar filtros
            </Button>
          </div>
        </div>

        {invalidDateRange ? (
          null
        ) : salesQuery.isPending ? (
          <p className={styles.status} role="status" aria-busy="true">Carregando histórico de vendas...</p>
        ) : salesQuery.isError ? (
          <div className={styles.details}>
            <p className={styles.error} role="alert">Não foi possível carregar o histórico de vendas.</p>
            <Button type="button" variant="secondary" onClick={() => void salesQuery.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : filteredSales.length === 0 ? (
          <p className={styles.empty} role="status">
            {salesQuery.data?.length ? 'Nenhuma venda encontrada para o período selecionado.' : 'Ainda não há vendas registradas.'}
          </p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <caption className={styles.notice}>Vendas registradas, da mais recente para a mais antiga</caption>
              <thead>
                <tr>
                  <th scope="col">Venda</th>
                  <th scope="col">Data e hora</th>
                  <th scope="col">Itens</th>
                  <th scope="col">Total final</th>
                  <th scope="col">Lucro bruto</th>
                  <th scope="col">Status</th>
                  <th scope="col">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <th scope="row">#{sale.id}</th>
                    <td>{formatDateTime(sale.createdAt)}</td>
                    <td>{quantityFormatter.format(getTotalItems(sale))}</td>
                    <td>{currencyFormatter.format(sale.total)}</td>
                    <td>
                      {formatGrossProfit(sale)}
                      {sale.status === 'COMPLETED' && !sale.grossProfitComplete ? (
                        <span className={styles.profitMissing}>
                          {' '}· {sale.itemsWithoutHistoricalCost} sem custo
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <Badge variant={sale.status === 'COMPLETED' ? 'success' : 'neutral'}>
                        {formatStatus(sale.status)}
                      </Badge>
                    </td>
                    <td>
                      <Link className={styles.link} to={`/sales/${sale.id}`} aria-label={`Ver detalhes da venda ${sale.id}`}>
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}

export function SalesPage() {
  const { saleId } = useParams()

  return (
    <section className={styles.page}>
      {saleId ? <SaleDetails saleId={saleId} /> : <SalesList />}
    </section>
  )
}
