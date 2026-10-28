import { useState } from 'react'
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
  const cents = sales.reduce(
    (total, sale) => total + Math.round((sale.grossProfitKnownAmount ?? 0) * 100),
    0,
  )

  return cents / 100
}

function formatGrossProfit(sale: SaleRecord) {
  if (sale.status !== 'COMPLETED' || sale.grossProfitKnownAmount === null) {
    return '—'
  }
  if (!sale.grossProfitComplete) {
    return `Incompleto (${currencyFormatter.format(sale.grossProfitKnownAmount)})`
  }
  return currencyFormatter.format(sale.grossProfitKnownAmount)
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
          <div>
            <dt>Total da venda</dt>
            <dd>{currencyFormatter.format(sale.total)}</dd>
          </div>
          <div>
            <dt>Lucro bruto</dt>
            <dd>{formatGrossProfit(sale)}</dd>
          </div>
        </dl>
        {sale.status === 'COMPLETED' && !sale.grossProfitComplete ? (
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
                  <th scope="col">Quantidade</th>
                  <th scope="col">Preço unitário</th>
                  <th scope="col">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, index) => (
                  <tr key={`${item.productId}-${index}`}>
                    <th scope="row">{item.productName}</th>
                    <td>{quantityFormatter.format(item.quantity)}</td>
                    <td>{currencyFormatter.format(item.unitPrice)}</td>
                    <td>{currencyFormatter.format(item.subtotal)}</td>
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
  const missingCostItems = completedSales.reduce(
    (total, sale) => total + sale.itemsWithoutHistoricalCost,
    0,
  )

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
  }

  return (
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

      <p className={styles.notice}>
        A API não oferece paginação nem filtros por data. O histórico é carregado integralmente e as datas são
        filtradas localmente.
      </p>

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
        <>
        {completedSales.length ? (
          <div className={styles.profitSummary} role="status">
            <strong>Lucro bruto do período:</strong>
            <span>
              {missingCostItems
                ? `Incompleto · conhecido ${currencyFormatter.format(knownProfitTotal)}`
                : currencyFormatter.format(knownProfitTotal)}
            </span>
            {missingCostItems ? (
              <span>{missingCostItems} item(ns) sem custo histórico</span>
            ) : null}
          </div>
        ) : null}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <caption className={styles.notice}>Vendas registradas, da mais recente para a mais antiga</caption>
            <thead>
              <tr>
                <th scope="col">Venda</th>
                <th scope="col">Data e hora</th>
                <th scope="col">Itens</th>
                <th scope="col">Total</th>
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
        </>
      )}
    </Card>
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
