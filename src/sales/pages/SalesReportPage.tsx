import { useState, type FormEvent } from 'react'
import { Banknote, ChartColumnIncreasing, ReceiptText, RefreshCw, TrendingUp } from 'lucide-react'
import { Button } from '../../shared/components/Button/Button'
import { Card } from '../../shared/components/Card/Card'
import { Input } from '../../shared/components/Input/Input'
import { useSalesReport, type SalesReportPeriod } from '../hooks/useSalesReport'
import type { SalesReport } from '../services/salesReportApi'
import { getMaximumDailyValue } from '../services/salesReportScale'
import styles from './SalesReportPage.module.css'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const quantityFormatter = new Intl.NumberFormat('pt-BR')

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function toLocalIsoDate(date: Date) {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function createInitialPeriod(): SalesReportPeriod {
  const today = new Date()
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  start.setDate(start.getDate() - 6)

  return {
    startDate: toLocalIsoDate(start),
    endDate: toLocalIsoDate(end),
  }
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)

  return dateFormatter.format(new Date(year, month - 1, day))
}

function getDateErrors(startDate: string, endDate: string) {
  const errors: { startDate?: string; endDate?: string } = {}

  if (!startDate) {
    errors.startDate = 'Informe a data inicial.'
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !isCalendarDate(startDate)) {
    errors.startDate = 'Informe uma data inicial válida.'
  }

  if (!endDate) {
    errors.endDate = 'Informe a data final.'
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || !isCalendarDate(endDate)) {
    errors.endDate = 'Informe uma data final válida.'
  } else if (!errors.startDate && startDate && endDate < startDate) {
    errors.endDate = 'A data final não pode ser anterior à data inicial.'
  }

  return errors
}

function isCalendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]

  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth
}

function ReportMetric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof Banknote
  tone: 'primary' | 'success' | 'warning'
}) {
  return (
    <Card className={styles.metricCard}>
      <div className={styles.metric}>
        <span className={`${styles.metricIcon} ${styles[tone]}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
        <span className={styles.metricLabel}>{label}</span>
        <strong className={styles.metricValue}>{value}</strong>
      </div>
    </Card>
  )
}

function DailySalesSeries({ report }: { report: SalesReport }) {
  const maximumRevenue = getMaximumDailyValue(report.dailySales, 'revenue')
  const maximumSales = getMaximumDailyValue(report.dailySales, 'salesCount')

  return (
    <Card title="Evolução diária" className={styles.seriesCard}>
      <p className={styles.seriesDescription}>
        Receita e quantidade de vendas concluídas em cada dia do período.
      </p>
      {report.salesCount === 0 ? (
        <p className={styles.emptyState} role="status">
          Nenhuma venda concluída neste período. Os dias sem vendas permanecem na série com valores zero.
        </p>
      ) : null}
      <ul className={styles.dailyList} aria-label="Série diária de vendas">
        {report.dailySales.map((entry) => {
          const revenueWidth = maximumRevenue > 0 ? (entry.revenue / maximumRevenue) * 100 : 0
          const salesWidth = maximumSales > 0 ? (entry.salesCount / maximumSales) * 100 : 0

          return (
            <li className={styles.dailyItem} key={entry.date}>
              <h4 className={styles.dayHeading}>{formatDate(entry.date)}</h4>
              <div className={styles.barRow}>
                <span className={styles.barLabel}>Receita</span>
                <div
                  className={styles.barTrack}
                  role="meter"
                  aria-label={`Receita em ${formatDate(entry.date)}`}
                  aria-valuemin={0}
                  aria-valuemax={maximumRevenue || 1}
                  aria-valuenow={entry.revenue}
                >
                  <span className={`${styles.bar} ${styles.revenueBar}`} style={{ width: `${revenueWidth}%` }} />
                </div>
                <strong className={styles.barValue}>{currencyFormatter.format(entry.revenue)}</strong>
              </div>
              <div className={styles.barRow}>
                <span className={styles.barLabel}>Vendas</span>
                <div
                  className={styles.barTrack}
                  role="meter"
                  aria-label={`Quantidade de vendas em ${formatDate(entry.date)}`}
                  aria-valuemin={0}
                  aria-valuemax={maximumSales || 1}
                  aria-valuenow={entry.salesCount}
                >
                  <span className={`${styles.bar} ${styles.salesBar}`} style={{ width: `${salesWidth}%` }} />
                </div>
                <strong className={styles.barValue}>{quantityFormatter.format(entry.salesCount)}</strong>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export function SalesReportPage() {
  const [startDate, setStartDate] = useState(() => createInitialPeriod().startDate)
  const [endDate, setEndDate] = useState(() => createInitialPeriod().endDate)
  const [showValidation, setShowValidation] = useState(false)
  const [appliedPeriod, setAppliedPeriod] = useState<SalesReportPeriod | null>(null)
  const reportQuery = useSalesReport(appliedPeriod)
  const dateErrors: ReturnType<typeof getDateErrors> = showValidation ? getDateErrors(startDate, endDate) : {}
  const report = reportQuery.data

  const submitPeriod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (reportQuery.isFetching) {
      return
    }

    setShowValidation(true)
    const errors = getDateErrors(startDate, endDate)
    if (errors.startDate || errors.endDate) {
      return
    }

    const nextPeriod = { startDate, endDate }
    if (appliedPeriod?.startDate === startDate && appliedPeriod.endDate === endDate) {
      void reportQuery.refetch()
      return
    }

    setAppliedPeriod(nextPeriod)
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Vendas</p>
          <h1>Relatório de vendas</h1>
          <p className={styles.subtitle}>Consulte os resultados das vendas concluídas em um período.</p>
        </div>
        {report ? (
          <span className={styles.periodLabel}>
            Período exibido: {formatDate(report.startDate)} a {formatDate(report.endDate)}
          </span>
        ) : null}
      </header>

      <Card title="Período do relatório" className={styles.filtersCard}>
        <form className={styles.filters} onSubmit={submitPeriod} noValidate>
          <Input
            label="Data inicial"
            name="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            error={dateErrors.startDate}
            aria-invalid={Boolean(dateErrors.startDate)}
          />
          <Input
            label="Data final"
            name="endDate"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            error={dateErrors.endDate}
            aria-invalid={Boolean(dateErrors.endDate)}
          />
          <Button
            type="submit"
            loading={reportQuery.isFetching}
            disabled={reportQuery.isFetching}
            icon={!reportQuery.isFetching ? <ChartColumnIncreasing size={18} aria-hidden="true" /> : undefined}
          >
            {reportQuery.isFetching
              ? 'Consultando...'
              : appliedPeriod
                ? 'Atualizar relatório'
                : 'Gerar relatório'}
          </Button>
        </form>
        <p className={styles.dateHint}>O período inicial e final são inclusivos. A sugestão inicial considera hoje e os seis dias anteriores.</p>
      </Card>

      {!appliedPeriod ? (
        <Card className={styles.stateCard}>
          <p className={styles.stateMessage} role="status">
            Confirme o período para gerar o relatório.
          </p>
        </Card>
      ) : null}

      {appliedPeriod && reportQuery.isPending && !report ? (
        <Card className={styles.stateCard}>
          <p className={styles.stateMessage} role="status" aria-busy="true">
            <span className={styles.spinner} aria-hidden="true" />
            Carregando relatório de vendas...
          </p>
        </Card>
      ) : null}

      {reportQuery.isFetching && report ? (
        <p className={styles.updateStatus} role="status" aria-busy="true">
          <RefreshCw size={16} aria-hidden="true" />
          Atualizando o relatório. Os dados exibidos continuam identificados pelo período acima.
        </p>
      ) : null}

      {reportQuery.isError ? (
        <Card className={styles.stateCard}>
          <div className={styles.errorState}>
            <p className={styles.stateMessage} role="alert">
              Não foi possível carregar o relatório. Verifique a conexão e tente novamente.
            </p>
            <Button
              type="button"
              variant="secondary"
              icon={<RefreshCw size={16} aria-hidden="true" />}
              disabled={reportQuery.isFetching}
              onClick={() => void reportQuery.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        </Card>
      ) : null}

      {report ? (
        <div className={styles.reportContent} aria-busy={reportQuery.isFetching}>
          <section className={styles.metrics} aria-label="Indicadores do período">
            <ReportMetric
              label="Receita total"
              value={currencyFormatter.format(report.totalRevenue)}
              icon={Banknote}
              tone="primary"
            />
            <ReportMetric
              label="Quantidade de vendas"
              value={quantityFormatter.format(report.salesCount)}
              icon={ReceiptText}
              tone="success"
            />
            <ReportMetric
              label="Ticket médio"
              value={currencyFormatter.format(report.averageTicket)}
              icon={TrendingUp}
              tone="warning"
            />
            <ReportMetric
              label="Lucro bruto"
              value={report.grossProfitComplete
                ? currencyFormatter.format(report.grossProfitKnownAmount)
                : `Incompleto · conhecido ${currencyFormatter.format(report.grossProfitKnownAmount)}`}
              icon={TrendingUp}
              tone={report.grossProfitComplete ? 'success' : 'warning'}
            />
          </section>
          {!report.grossProfitComplete ? (
            <p className={styles.profitNotice} role="status">
              Lucro bruto incompleto: {report.itemsWithoutHistoricalCost} item(ns) sem custo histórico no período.
            </p>
          ) : null}
          <DailySalesSeries report={report} />
        </div>
      ) : null}
    </section>
  )
}
