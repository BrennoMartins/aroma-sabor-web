import { AlertCircle, PackageCheck, RefreshCw } from 'lucide-react'
import { Badge } from '../../shared/components/Badge/Badge'
import { Button } from '../../shared/components/Button/Button'
import { Card } from '../../shared/components/Card/Card'
import { useTurnSummary } from '../hooks/useTurnSummary'
import type { TurnSummary as TurnSummaryData } from '../types/marketSession'
import styles from './TurnSummary.module.css'

type TurnSummaryProps = {
  turnId: string | null | undefined
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const quantityFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Não informado'
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? 'Não informado' : dateTimeFormatter.format(date)
}

function formatTurnDuration(durationInMinutes: number) {
  const safeMinutes = Math.max(0, Math.floor(durationInMinutes))
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  if (hours === 0) {
    return `${minutes}min`
  }

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}min`
}

function SummaryContent({ summary }: { summary: TurnSummaryData }) {
  const statusIsOpen = summary.status === 'OPEN'
  const topProducts = summary.topProducts.slice(0, 5)

  return (
    <>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Turno</p>
          <h2 className={styles.title}>Resumo do Mercado</h2>
        </div>
        <Badge variant={statusIsOpen ? 'success' : 'neutral'}>
          {statusIsOpen ? 'Aberto' : 'Fechado'}
        </Badge>
      </header>

      <section aria-labelledby="turn-summary-details" className={styles.detailsSection}>
        <h3 id="turn-summary-details" className={styles.sectionTitle}>Informações do turno</h3>
        <dl className={styles.details}>
          <div>
            <dt>Abertura</dt>
            <dd>{formatDateTime(summary.openedAt)}</dd>
          </div>
          {summary.closedAt ? (
            <div>
              <dt>Fechamento</dt>
              <dd>{formatDateTime(summary.closedAt)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Duração</dt>
            <dd>{formatTurnDuration(summary.durationInMinutes)}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Indicadores principais" className={styles.metrics}>
        <div className={styles.metric}>
          <span>Vendas</span>
          <strong>{quantityFormatter.format(summary.salesCount)}</strong>
        </div>
        <div className={styles.metric}>
          <span>Faturamento líquido</span>
          <strong>{currencyFormatter.format(summary.totalRevenue)}</strong>
        </div>
        <div className={styles.metric}>
          <span>Ticket médio</span>
          <strong>{currencyFormatter.format(summary.averageTicket)}</strong>
        </div>
      </section>

      {summary.salesCount === 0 ? (
        <p className={styles.emptySales}>Este turno ainda não possui vendas.</p>
      ) : null}

      <section aria-labelledby="turn-summary-top-products" className={styles.productsSection}>
        <h3 id="turn-summary-top-products" className={styles.sectionTitle}>Top produtos</h3>
        {topProducts.length ? (
          <p className={styles.mutedMessage}>
            Valores por produto antes do desconto geral; não somam o faturamento líquido do turno.
          </p>
        ) : null}
        {topProducts.length ? (
          <ol className={styles.productList}>
            {topProducts.map((product, index) => (
              <li className={styles.product} key={product.productId}>
                <span className={styles.position} aria-label={`Posição ${index + 1}`}>
                  {index + 1}
                </span>
                <div className={styles.productInfo}>
                  <strong>{product.productName}</strong>
                  <span>{quantityFormatter.format(product.quantitySold)} un.</span>
                </div>
                <strong
                  className={styles.revenue}
                  title="Valor antes do desconto geral"
                  aria-label={`Valor antes do desconto geral: ${currencyFormatter.format(product.revenue)}`}
                >
                  {currencyFormatter.format(product.revenue)}
                </strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.mutedMessage}>Nenhum produto vendido ainda.</p>
        )}
      </section>

      <div className={summary.lowStockProductCount > 0 ? styles.lowStock : styles.stockOk}>
        <PackageCheck size={18} aria-hidden="true" />
        <span>
          {summary.lowStockProductCount} produtos com estoque baixo
        </span>
      </div>
    </>
  )
}

export function TurnSummary({ turnId }: TurnSummaryProps) {
  const { data, isError, isLoading, refetch, isFetching } = useTurnSummary(turnId)

  if (!turnId) {
    return (
      <Card className={styles.summary}>
        <h2 className={styles.title}>Resumo do Mercado</h2>
        <p className={styles.mutedMessage}>Selecione um turno para consultar o resumo.</p>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className={styles.summary}>
        <div className={styles.loadingState} aria-busy="true">
          <div className={styles.header}>
            <h2 className={styles.title}>Resumo do Mercado</h2>
            <span className={styles.loadingLabel} role="status">Carregando resumo do turno...</span>
          </div>
          <div className={styles.skeleton} aria-hidden="true" />
          <div className={styles.skeleton} aria-hidden="true" />
          <div className={styles.skeleton} aria-hidden="true" />
        </div>
      </Card>
    )
  }

  if (isError || !data) {
    return (
      <Card className={styles.summary}>
        <h2 className={styles.title}>Resumo do Mercado</h2>
        <div className={styles.error} role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <p>Não foi possível carregar o resumo do turno. Verifique sua conexão e tente novamente.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          icon={<RefreshCw size={16} aria-hidden="true" />}
          loading={isFetching}
          onClick={() => void refetch()}
        >
          Tentar novamente
        </Button>
      </Card>
    )
  }

  return (
    <Card className={styles.summary}>
      <SummaryContent summary={data} />
    </Card>
  )
}
