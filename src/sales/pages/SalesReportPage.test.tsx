// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { salesReportQueryKey } from '../hooks/useSalesReport'
import { getMaximumDailyValue } from '../services/salesReportScale'
import { SalesReportPage } from './SalesReportPage'
import type { SalesReport } from '../services/salesReportApi'

const getSalesReportMock = vi.fn<(startDate: string, endDate: string) => Promise<SalesReport>>()

vi.mock('../services/salesReportApi', () => ({
  getSalesReport: (startDate: string, endDate: string) => getSalesReportMock(startDate, endDate),
}))

const report: SalesReport = {
  startDate: '2026-10-01',
  endDate: '2026-10-03',
  totalRevenue: 1234.56,
  salesCount: 42,
  averageTicket: 17.77,
  grossProfitKnownAmount: 432.1,
  grossProfitComplete: true,
  itemsWithoutHistoricalCost: 0,
  dailySales: [
    { date: '2026-10-01', revenue: 900.5, salesCount: 20 },
    { date: '2026-10-02', revenue: 0, salesCount: 0 },
    { date: '2026-10-03', revenue: 334.06, salesCount: 22 },
  ],
}

describe('SalesReportPage', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    getSalesReportMock.mockReset()
  })

  afterEach(() => {
    act(() => root.unmount())
    queryClient.clear()
    container.remove()
    document.body.innerHTML = ''
  })

  async function render() {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <SalesReportPage />
          </MemoryRouter>
        </QueryClientProvider>,
      )
    })
  }

  async function waitForText(text: string) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (document.body.textContent?.includes(text)) {
        return
      }

      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 5))
      })
    }

    throw new Error(`Timed out waiting for text: ${text}`)
  }

  function setDate(name: 'startDate' | 'endDate', value: string) {
    const input = container.querySelector<HTMLInputElement>(`input[name="${name}"]`)
    if (!input) {
      throw new Error(`Date input ${name} was not rendered.`)
    }

    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  async function submitPeriod() {
    const form = container.querySelector('form')
    if (!form) {
      throw new Error('Report period form was not rendered.')
    }

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
  }

  it('renders date controls with a local seven-day suggestion and waits for confirmation', async () => {
    await render()

    const startDate = container.querySelector<HTMLInputElement>('input[name="startDate"]')
    const endDate = container.querySelector<HTMLInputElement>('input[name="endDate"]')
    expect(startDate?.value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(endDate?.value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(container.textContent).toContain('Confirme o período para gerar o relatório.')
    expect(getSalesReportMock).not.toHaveBeenCalled()
  })

  it('calculates the scale for a large daily series without argument expansion', () => {
    const dailySales = Array.from({ length: 150_000 }, (_, index) => ({
      date: '2026-10-01',
      revenue: index === 149_999 ? 250 : 0,
      salesCount: index === 149_999 ? 7 : 0,
    }))

    expect(getMaximumDailyValue(dailySales, 'revenue')).toBe(250)
    expect(getMaximumDailyValue(dailySales, 'salesCount')).toBe(7)
    expect(getMaximumDailyValue([], 'revenue')).toBe(0)
    expect(getMaximumDailyValue([{ date: '2026-10-01', revenue: 0, salesCount: 0 }], 'revenue')).toBe(0)
  })

  it('validates missing and inverted dates, then submits the confirmed ISO period', async () => {
    getSalesReportMock.mockResolvedValueOnce(report)
    await render()

    setDate('startDate', '')
    setDate('endDate', '')
    await submitPeriod()
    expect(container.textContent).toContain('Informe a data inicial.')
    expect(container.textContent).toContain('Informe a data final.')
    expect(getSalesReportMock).not.toHaveBeenCalled()

    setDate('startDate', '2026-10-03')
    setDate('endDate', '2026-10-01')
    await submitPeriod()
    expect(container.textContent).toContain('A data final não pode ser anterior à data inicial.')
    expect(getSalesReportMock).not.toHaveBeenCalled()

    setDate('startDate', '2026-10-01')
    setDate('endDate', '2026-10-03')
    await submitPeriod()
    await waitForText('Receita líquida total')

    expect(getSalesReportMock).toHaveBeenCalledWith('2026-10-01', '2026-10-03')
  })

  it('renders API indicators and a chronological daily series with zero-sales days', async () => {
    getSalesReportMock.mockResolvedValueOnce(report)
    await render()

    setDate('startDate', '2026-10-01')
    setDate('endDate', '2026-10-03')
    await submitPeriod()
    await waitForText('Evolução diária')

    const text = document.body.textContent ?? ''
    const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    expect(text).toContain(currency.format(1234.56))
    expect(text).toContain('42')
    expect(text).toContain(currency.format(17.77))
    expect(text).toContain('Lucro bruto')
    expect(text).toContain(currency.format(432.1))
    expect(text).not.toContain(currency.format(1234.56 / 42))

    const days = [...container.querySelectorAll('[aria-label="Série diária de vendas"] > li')]
    expect(days).toHaveLength(3)
    expect(days.map((day) => day.querySelector('h4')?.textContent)).toEqual([
      '01/10/2026',
      '02/10/2026',
      '03/10/2026',
    ])
    expect(days[1].textContent).toContain(currency.format(0))
    expect(days[1].textContent).toContain('0')
  })

  it('shows net revenue, negative incomplete profit and no extra discount subtraction', async () => {
    getSalesReportMock.mockResolvedValueOnce({
      ...report,
      totalRevenue: 500,
      grossProfitKnownAmount: -12.4,
      grossProfitComplete: false,
      itemsWithoutHistoricalCost: 3,
    })
    await render()

    setDate('startDate', '2026-10-01')
    setDate('endDate', '2026-10-03')
    await submitPeriod()
    await waitForText('Receita líquida total')

    const text = (document.body.textContent ?? '').replace(/\u00a0/g, ' ')
    expect(text).toContain('R$ 500,00')
    expect(text).toContain('Incompleto')
    expect(text).toContain('-R$ 12,40')
    expect(text).toContain('3 item(ns) sem custo histórico no período')
  })

  it('shows a clear no-sales state while retaining zero-valued daily entries', async () => {
    getSalesReportMock.mockResolvedValueOnce({
      startDate: '2026-10-08',
      endDate: '2026-10-09',
      totalRevenue: 0,
      salesCount: 0,
      averageTicket: 0,
      grossProfitKnownAmount: 0,
      grossProfitComplete: true,
      itemsWithoutHistoricalCost: 0,
      dailySales: [
        { date: '2026-10-08', revenue: 0, salesCount: 0 },
        { date: '2026-10-09', revenue: 0, salesCount: 0 },
      ],
    })
    await render()

    setDate('startDate', '2026-10-08')
    setDate('endDate', '2026-10-09')
    await submitPeriod()
    await waitForText('Nenhuma venda concluída neste período.')

    expect(container.querySelectorAll('[aria-label="Série diária de vendas"] > li')).toHaveLength(2)
    expect(container.textContent).toContain(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(0),
    )
  })

  it('shows loading and prevents duplicate submissions while a request is in progress', async () => {
    getSalesReportMock.mockReturnValueOnce(new Promise(() => undefined))
    await render()

    setDate('startDate', '2026-10-01')
    setDate('endDate', '2026-10-03')
    await submitPeriod()

    expect(container.textContent).toContain('Carregando relatório de vendas...')
    const submitButton = container.querySelector<HTMLButtonElement>('button[type="submit"]')
    expect(submitButton?.disabled).toBe(true)
    expect(getSalesReportMock).toHaveBeenCalledTimes(1)
  })

  it('hides backend details on errors and permits retrying the same period', async () => {
    getSalesReportMock
      .mockRejectedValueOnce(new Error('internal backend detail'))
      .mockResolvedValueOnce(report)
    await render()

    setDate('startDate', '2026-10-01')
    setDate('endDate', '2026-10-03')
    await submitPeriod()
    await waitForText('Não foi possível carregar o relatório.')

    expect(container.textContent).not.toContain('internal backend detail')
    const retryButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Tentar novamente'))
    expect(retryButton).toBeDefined()

    await act(async () => retryButton?.click())
    await waitForText('Evolução diária')
    expect(getSalesReportMock).toHaveBeenCalledTimes(2)
  })

  it('uses separate query keys and API requests for distinct periods', async () => {
    getSalesReportMock
      .mockResolvedValueOnce(report)
      .mockResolvedValueOnce({
        ...report,
        startDate: '2026-10-04',
        endDate: '2026-10-05',
        dailySales: [
          { date: '2026-10-04', revenue: 20, salesCount: 1 },
          { date: '2026-10-05', revenue: 15, salesCount: 1 },
        ],
      })
    await render()

    setDate('startDate', '2026-10-01')
    setDate('endDate', '2026-10-03')
    await submitPeriod()
    await waitForText('Evolução diária')

    setDate('startDate', '2026-10-04')
    setDate('endDate', '2026-10-05')
    await submitPeriod()
    await waitForText('Período exibido: 04/10/2026 a 05/10/2026')

    expect(getSalesReportMock).toHaveBeenNthCalledWith(1, '2026-10-01', '2026-10-03')
    expect(getSalesReportMock).toHaveBeenNthCalledWith(2, '2026-10-04', '2026-10-05')
    expect(salesReportQueryKey({ startDate: '2026-10-01', endDate: '2026-10-03' }))
      .not.toEqual(salesReportQueryKey({ startDate: '2026-10-04', endDate: '2026-10-05' }))
  })
})
