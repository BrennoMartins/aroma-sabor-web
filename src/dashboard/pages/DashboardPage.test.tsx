// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import type { DashboardSummary } from '../services/dashboardApi'

const getDashboardSummaryMock = vi.fn<() => Promise<DashboardSummary>>()
const getTopProductsMock = vi.fn()
const getLowStockProductsMock = vi.fn()

vi.mock('../services/dashboardApi', () => ({
  getDashboardSummary: () => getDashboardSummaryMock(),
  getTopProducts: () => getTopProductsMock(),
  getLowStockProducts: () => getLowStockProductsMock(),
}))

const openTurnSummary: DashboardSummary = {
  date: '2026-10-26',
  revenue: 58.5,
  salesCount: 2,
  averageTicket: 29.25,
  grossProfitKnownAmount: 14.5,
  grossProfitComplete: true,
  itemsWithoutHistoricalCost: 0,
  currentTurn: {
    id: '7a25b021-7f7c-4c0c-a343-2d7c784d5339',
    openedAt: '2026-10-26T08:00:00',
  },
  recentSales: [
    { id: 104, createdAt: '2026-10-26T09:35:00', total: 38.5 },
    { id: 103, createdAt: '2026-10-26T09:12:00', total: 20 },
  ],
}

describe('DashboardPage', () => {
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
    getDashboardSummaryMock.mockReset()
    getTopProductsMock.mockReset().mockResolvedValue([])
    getLowStockProductsMock.mockReset().mockResolvedValue([])
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
            <DashboardPage />
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

  async function waitForCallCount(mockFunction: ReturnType<typeof vi.fn>, count: number) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (mockFunction.mock.calls.length >= count) {
        return
      }

      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 5))
      })
    }

    throw new Error(`Timed out waiting for ${count} calls`)
  }

  it('renders the API indicators formatted as Brazilian currency and quantity', async () => {
    getDashboardSummaryMock.mockResolvedValueOnce(openTurnSummary)

    await render()
    await waitForText('Turno aberto')

    const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    expect(document.body.textContent).toContain(currency.format(58.5))
    expect(document.body.textContent).toContain(currency.format(29.25))
    expect(document.body.textContent).toContain('Lucro bruto do dia')
    expect(document.body.textContent).toContain(currency.format(14.5))
    expect(document.body.textContent).toContain('2')
    expect(document.body.textContent).toContain('26/10/2026')
  })

  it('identifies daily gross profit as incomplete instead of presenting it as final', async () => {
    getDashboardSummaryMock.mockResolvedValueOnce({
      ...openTurnSummary,
      grossProfitKnownAmount: 4.25,
      grossProfitComplete: false,
      itemsWithoutHistoricalCost: 2,
    })

    await render()
    await waitForText('Lucro bruto do dia')

    expect(document.body.textContent).toContain('Incompleto')
    expect(document.body.textContent).toContain('conhecido')
    expect(document.body.textContent).toContain('2 item(ns) sem custo histórico')
  })

  it('shows the current turn, opening time, recent sales and existing workflow links', async () => {
    getDashboardSummaryMock.mockResolvedValueOnce(openTurnSummary)

    await render()
    await waitForText('Venda #104')

    expect(document.body.textContent).toContain('7a25b021-7f7c-4c0c-a343-2d7c784d5339')
    expect(document.body.textContent).toContain('08:00')
    expect(container.querySelector('a[href="/caixa"]')?.textContent).toContain('fechamento')
    expect(container.querySelector('a[href="/sales/104"]')).not.toBeNull()
    expect(container.querySelector('a[href="/sales"]')?.textContent).toContain('histórico')
  })

  it('clearly indicates when there is no open turn and recent sales are empty', async () => {
    getDashboardSummaryMock.mockResolvedValueOnce({
      ...openTurnSummary,
      revenue: 0,
      salesCount: 0,
      averageTicket: 0,
      grossProfitKnownAmount: 0,
      grossProfitComplete: true,
      itemsWithoutHistoricalCost: 0,
      currentTurn: null,
      recentSales: [],
    })

    await render()
    await waitForText('Nenhum turno aberto')

    expect(document.body.textContent).toContain('Ainda não há vendas concluídas hoje.')
    expect(document.body.textContent).toContain(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(0),
    )
    expect(container.querySelector('a[href="/caixa"]')?.textContent).toContain('abertura')
  })

  it('shows a loading state without indicator values while the request is pending', async () => {
    getDashboardSummaryMock.mockReturnValueOnce(new Promise(() => undefined))

    await render()

    expect(document.body.textContent).toContain('Carregando indicadores do dia')
    expect(document.body.textContent).not.toContain('Faturamento do dia')
  })

  it('shows an error and retries the request when asked', async () => {
    getDashboardSummaryMock
      .mockRejectedValueOnce(new Error('network failure'))
      .mockResolvedValueOnce(openTurnSummary)

    await render()
    await waitForText('Não foi possível carregar os indicadores')

    const retryButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Tentar novamente'))
    expect(retryButton).toBeDefined()

    await act(async () => {
      retryButton?.click()
    })
    await waitForText('Turno aberto')

    expect(getDashboardSummaryMock).toHaveBeenCalledTimes(2)
  })

  it('renders top products in API order and shows their sold quantities', async () => {
    getDashboardSummaryMock.mockResolvedValueOnce(openTurnSummary)
    getTopProductsMock.mockResolvedValueOnce([
      { productId: 18, productName: 'Café', quantitySold: 20 },
      { productId: 9, productName: 'Arroz', quantitySold: 13 },
    ])
    getLowStockProductsMock.mockResolvedValueOnce([])

    await render()
    await waitForText('Café')

    const items = container.querySelectorAll('[aria-label="Ranking de produtos mais vendidos"] > li')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toContain('Café')
    expect(items[0].textContent).toContain('20')
    expect(items[1].textContent).toContain('Arroz')
    expect(items[1].textContent).toContain('13')
  })

  it('shows a friendly empty message when the top-products list is empty', async () => {
    getDashboardSummaryMock.mockResolvedValueOnce(openTurnSummary)
    getTopProductsMock.mockResolvedValueOnce([])

    await render()
    await waitForText('Ainda não há vendas concluídas suficientes neste período.')

    expect(container.textContent).not.toContain('Produto exemplo')
  })

  it('shows a loading state for top products while its request is pending', async () => {
    getTopProductsMock.mockReturnValueOnce(new Promise(() => undefined))

    await render()

    expect(container.textContent).toContain('Carregando os produtos mais vendidos')
  })

  it('refreshes all dashboard queries from the header action', async () => {
    getDashboardSummaryMock.mockResolvedValue(openTurnSummary)
    getTopProductsMock.mockResolvedValue([])
    getLowStockProductsMock.mockResolvedValue([])

    await render()
    await waitForText('Turno aberto')
    expect(getTopProductsMock).toHaveBeenCalledTimes(1)
    expect(getLowStockProductsMock).toHaveBeenCalledTimes(1)

    const refreshButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Atualizar'))
    expect(refreshButton).toBeDefined()
    await act(async () => refreshButton?.click())
    await waitForCallCount(getDashboardSummaryMock, 2)
    await waitForCallCount(getTopProductsMock, 2)
    await waitForCallCount(getLowStockProductsMock, 2)
  })

  it('shows top-products error and retries only that API without hiding low stock or summary', async () => {
    getDashboardSummaryMock.mockResolvedValueOnce(openTurnSummary)
    getTopProductsMock.mockRejectedValueOnce(new Error('top products unavailable'))
    getTopProductsMock.mockResolvedValueOnce([
      { productId: 18, productName: 'Café', quantitySold: 20 },
    ])
    getLowStockProductsMock.mockResolvedValueOnce([
      { id: 31, name: 'Açúcar', barcode: '78900031', stock: 2 },
    ])

    await render()
    await waitForText('Não foi possível carregar os produtos mais vendidos.')

    expect(container.textContent).toContain('Turno aberto')
    expect(container.textContent).toContain('Açúcar')

    const retryButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Tentar novamente'))
    expect(retryButton).toBeDefined()
    await act(async () => retryButton?.click())
    await waitForText('Café')

    expect(getTopProductsMock).toHaveBeenCalledTimes(2)
    expect(getLowStockProductsMock).toHaveBeenCalledTimes(1)
  })

  it('renders all returned low-stock products, their stock and barcode', async () => {
    getDashboardSummaryMock.mockResolvedValueOnce(openTurnSummary)
    getLowStockProductsMock.mockResolvedValueOnce(
      Array.from({ length: 8 }, (_, index) => ({
        id: index + 1,
        name: `Produto ${index + 1}`,
        barcode: `7890000${index + 1}`,
        stock: index === 0 ? 0 : index,
      })),
    )

    await render()
    await waitForText('Produto 8')

    const items = container.querySelectorAll('[aria-label="Produtos com estoque baixo"] > li')
    expect(items).toHaveLength(8)
    expect(items[0].textContent).toContain('0')
    expect(items[0].textContent).toContain('78900001')
    expect(container.textContent).not.toContain('Produto exemplo')
  })

  it('shows a positive empty state when no products have low stock', async () => {
    getDashboardSummaryMock.mockResolvedValueOnce(openTurnSummary)
    getLowStockProductsMock.mockResolvedValueOnce([])

    await render()
    await waitForText('Nenhum produto com estoque baixo.')

    expect(container.querySelector('[aria-label="Produtos com estoque baixo"]')).toBeNull()
  })

  it('shows low-stock loading while the API request is pending', async () => {
    getLowStockProductsMock.mockReturnValueOnce(new Promise(() => undefined))

    await render()

    expect(container.textContent).toContain('Carregando os produtos com estoque baixo')
  })

  it('shows low-stock error and retry without hiding top products or existing dashboard indicators', async () => {
    getDashboardSummaryMock.mockResolvedValueOnce(openTurnSummary)
    getTopProductsMock.mockResolvedValueOnce([
      { productId: 18, productName: 'Café', quantitySold: 20 },
    ])
    getLowStockProductsMock
      .mockRejectedValueOnce(new Error('low stock unavailable'))
      .mockResolvedValueOnce([
        { id: 31, name: 'Açúcar', barcode: '78900031', stock: 2 },
      ])

    await render()
    await waitForText('Não foi possível carregar os produtos com estoque baixo.')

    expect(container.textContent).toContain('Café')
    expect(container.textContent).toContain('Faturamento do dia')
    expect(container.textContent).toContain('Venda #104')

    const retryButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Tentar novamente'))
    expect(retryButton).toBeDefined()
    await act(async () => retryButton?.click())
    await waitForText('Açúcar')

    expect(getLowStockProductsMock).toHaveBeenCalledTimes(2)
    expect(getTopProductsMock).toHaveBeenCalledTimes(1)
  })
})
