import {
  ArrowRight,
  Banknote,
  CircleAlert,
  CircleCheck,
  Clock3,
  ReceiptText,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '../../shared/components/Button/Button'
import { Card } from '../../shared/components/Card/Card'
import { useDashboardSummary } from '../hooks/useDashboardSummary'
import { DashboardProductSections } from './DashboardProductSections'
import styles from './DashboardPage.module.css'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const quantityFormatter = new Intl.NumberFormat('pt-BR')

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function parseLocalDateTime(value: string) {
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)

  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

function formatDateTime(value: string) {
  const date = parseLocalDateTime(value)

  return date ? dateTimeFormatter.format(date) : 'Horário indisponível'
}

function DashboardMetric({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string
  value: string
  icon: typeof Banknote
  tone: 'primary' | 'success' | 'warning'
}) {
  return (
    <Card className={styles.metricCard}>
      <div className={styles.metric}>
        <div className={`${styles.metricIcon} ${styles[tone]}`}>
          <Icon size={20} aria-hidden="true" />
        </div>
        <span className={styles.metricLabel}>{title}</span>
        <strong className={styles.metricValue}>{value}</strong>
      </div>
    </Card>
  )
}

export function DashboardPage() {
  const queryClient = useQueryClient()
  const summaryQuery = useDashboardSummary()
  const summary = summaryQuery.data

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Aroma Sabor OS</p>
          <h1>Dashboard operacional</h1>
          {summary ? <p className={styles.date}>{formatDate(summary.date)}</p> : null}
        </div>
        <Button
          type="button"
          variant="secondary"
          icon={<RefreshCw size={16} aria-hidden="true" />}
          onClick={() => void queryClient.invalidateQueries({ queryKey: ['dashboard'] })}
        >
          Atualizar
        </Button>
      </header>

      {summaryQuery.isPending && !summary ? (
        <Card className={styles.stateCard}>
          <p className={styles.stateMessage} role="status" aria-busy="true">
            <span className={styles.spinner} aria-hidden="true" />
            Carregando indicadores do dia...
          </p>
        </Card>
      ) : summaryQuery.isError && !summary ? (
        <Card className={styles.stateCard}>
          <div className={styles.errorState}>
            <CircleAlert size={24} aria-hidden="true" />
            <p className={styles.stateMessage} role="alert">
              Não foi possível carregar os indicadores do dia. Verifique a conexão e tente novamente.
            </p>
            <Button
              type="button"
              variant="secondary"
              icon={<RefreshCw size={16} aria-hidden="true" />}
              onClick={() => void summaryQuery.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        </Card>
      ) : summary ? (
        <>
          <section className={styles.metrics} aria-label="Indicadores de hoje">
            <DashboardMetric
              title="Faturamento líquido do dia"
              value={currencyFormatter.format(summary.revenue)}
              icon={Banknote}
              tone="primary"
            />
            <DashboardMetric
              title="Vendas concluídas"
              value={quantityFormatter.format(summary.salesCount)}
              icon={ReceiptText}
              tone="success"
            />
            <DashboardMetric
              title="Ticket médio"
              value={currencyFormatter.format(summary.averageTicket)}
              icon={TrendingUp}
              tone="warning"
            />
            <DashboardMetric
              title="Lucro bruto do dia"
              value={summary.grossProfitComplete
                ? currencyFormatter.format(summary.grossProfitKnownAmount)
                : `Incompleto · conhecido ${currencyFormatter.format(summary.grossProfitKnownAmount)}`}
              icon={TrendingUp}
              tone={summary.grossProfitComplete ? 'success' : 'warning'}
            />
          </section>
          {!summary.grossProfitComplete ? (
            <p className={styles.profitNotice} role="status">
              Lucro bruto incompleto: {summary.itemsWithoutHistoricalCost} item(ns) sem custo histórico.
            </p>
          ) : null}

          <section className={styles.content}>
            <Card title="Estado do caixa" className={styles.panel}>
              {summary.currentTurn ? (
                <div className={styles.turnState}>
                  <div className={`${styles.turnStatus} ${styles.turnOpen}`}>
                    <CircleCheck size={20} aria-hidden="true" />
                    <strong>Turno aberto</strong>
                  </div>
                  <dl className={styles.turnDetails}>
                    <div>
                      <dt>Identificador do turno</dt>
                      <dd>{summary.currentTurn.id}</dd>
                    </div>
                    <div>
                      <dt>Aberto em</dt>
                      <dd>
                        <Clock3 size={15} aria-hidden="true" />
                        {formatDateTime(summary.currentTurn.openedAt)}
                      </dd>
                    </div>
                  </dl>
                  <Link className={styles.actionLink} to="/caixa">
                    Acessar fechamento do caixa
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <div className={styles.turnState}>
                  <div className={`${styles.turnStatus} ${styles.turnClosed}`}>
                    <CircleAlert size={20} aria-hidden="true" />
                    <strong>Nenhum turno aberto</strong>
                  </div>
                  <p className={styles.secondaryText}>
                    Abra um turno para iniciar as operações de venda.
                  </p>
                  <Link className={styles.actionLink} to="/caixa">
                    Ir para abertura do caixa
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </Card>

            <Card title="Vendas recentes" className={styles.panel}>
              {summary.recentSales.length === 0 ? (
                <p className={styles.emptyState} role="status">
                  Ainda não há vendas concluídas hoje.
                </p>
              ) : (
                <ul className={styles.salesList}>
                  {summary.recentSales.map((sale) => (
                    <li className={styles.saleItem} key={sale.id}>
                      <Link className={styles.saleLink} to={`/sales/${sale.id}`}>
                        <span className={styles.saleDescription}>
                          <strong>Venda #{sale.id}</strong>
                          <span>{formatDateTime(sale.createdAt)}</span>
                        </span>
                        <span className={styles.saleTotal}>{currencyFormatter.format(sale.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link className={`${styles.actionLink} ${styles.salesAction}`} to="/sales">
                Ver histórico de vendas
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </Card>
          </section>
        </>
      ) : null}

      <DashboardProductSections />
    </div>
  )
}
