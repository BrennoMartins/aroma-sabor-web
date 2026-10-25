// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TurnSummary } from './TurnSummary'
import type { TurnSummary as TurnSummaryData } from '../types/marketSession'

const getTurnSummaryMock = vi.fn()

vi.mock('../services/turnApi', () => ({
  getTurnSummary: (...args: unknown[]) => getTurnSummaryMock(...args),
}))

function createSummary(overrides: Partial<TurnSummaryData> = {}): TurnSummaryData {
  return {
    turnId: 'turn-1',
    status: 'CLOSED',
    openedAt: '2026-09-29T09:22:00.000Z',
    closedAt: '2026-09-29T17:00:00.000Z',
    durationInMinutes: 456,
    salesCount: 24,
    totalRevenue: 1842.5,
    averageTicket: 76.77,
    topProducts: Array.from({ length: 6 }, (_, index) => ({
      productId: `product-${index + 1}`,
      productName: `Produto ${index + 1}`,
      quantitySold: index + 1,
      revenue: (index + 1) * 10.5,
    })),
    lowStockProductCount: 3,
    ...overrides,
  }
}

describe('TurnSummary', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })
    getTurnSummaryMock.mockReset()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    queryClient.clear()
    container.remove()
    document.body.innerHTML = ''
  })

  async function render(turnId: string | null | undefined = 'turn-1') {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <TurnSummary turnId={turnId} />
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

  it('mostra os dados do turno, vendas, faturamento e ticket médio formatados', async () => {
    getTurnSummaryMock.mockResolvedValueOnce(createSummary())

    await render()
    await waitForText('Fechado')

    const text = document.body.textContent ?? ''
    expect(text).toContain('Fechado')
    expect(text).toContain('Abertura')
    expect(text).toContain('Fechamento')
    expect(text).toContain('7h 36min')
    expect(text).toContain('24')
    expect(text).toContain(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(1842.5))
    expect(text).toContain(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(76.77))
    expect(getTurnSummaryMock).toHaveBeenCalledWith('turn-1')
  })

  it('mostra no máximo cinco produtos com posição, quantidade e receita', async () => {
    getTurnSummaryMock.mockResolvedValueOnce(createSummary())

    await render()
    await waitForText('Produto 5')

    expect(container.querySelectorAll('ol li')).toHaveLength(5)
    expect(document.body.textContent).toContain('1 un.')
    expect(document.body.textContent).toContain(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(10.5),
    )
    expect(document.body.textContent).not.toContain('Produto 6')
  })

  it('destaca a quantidade de produtos com estoque baixo', async () => {
    getTurnSummaryMock.mockResolvedValueOnce(createSummary())

    await render()
    await waitForText('3 produtos com estoque baixo')

    expect(document.body.textContent).toContain('3 produtos com estoque baixo')
  })

  it('mostra estado positivo quando não há produtos com estoque baixo', async () => {
    getTurnSummaryMock.mockResolvedValueOnce(createSummary({ lowStockProductCount: 0 }))

    await render()
    await waitForText('0 produtos com estoque baixo')

    expect(document.body.textContent).toContain('0 produtos com estoque baixo')
  })

  it('informa quando o turno ainda não possui vendas', async () => {
    getTurnSummaryMock.mockResolvedValueOnce(
      createSummary({ salesCount: 0, totalRevenue: 0, averageTicket: 0, topProducts: [] }),
    )

    await render()
    await waitForText('Este turno ainda não possui vendas.')

    expect(document.body.textContent).toContain('Este turno ainda não possui vendas.')
  })

  it('apresenta loading acessível enquanto carrega', async () => {
    getTurnSummaryMock.mockReturnValueOnce(new Promise(() => undefined))

    await render()

    expect(container.querySelector('[role="status"]')?.textContent).toBe('Carregando resumo do turno...')
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('mostra erro amigável e permite tentar novamente', async () => {
    getTurnSummaryMock.mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce(createSummary())

    await render()
    await waitForText('Não foi possível carregar o resumo do turno.')

    const retryButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Tentar novamente'),
    )
    expect(retryButton).toBeDefined()

    await act(async () => {
      retryButton?.click()
    })
    await waitForText('7h 36min')

    expect(getTurnSummaryMock).toHaveBeenCalledTimes(2)
  })

  it('não busca o resumo quando não há identificador do turno', async () => {
    await render(null)

    expect(document.body.textContent).toContain('Selecione um turno para consultar o resumo.')
    expect(getTurnSummaryMock).not.toHaveBeenCalled()
  })
})
