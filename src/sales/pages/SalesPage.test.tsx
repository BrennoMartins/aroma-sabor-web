// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SalesPage } from './SalesPage'
import type { SaleRecord } from '../services/salesApi'

const getSalesMock = vi.fn()
const getSaleByIdMock = vi.fn()

vi.mock('../services/salesApi', () => ({
  getSales: (...args: unknown[]) => getSalesMock(...args),
  getSaleById: (...args: unknown[]) => getSaleByIdMock(...args),
}))

const sales: SaleRecord[] = [
  {
    id: 41,
    total: 29.98,
    status: 'COMPLETED',
    createdAt: '2026-10-25T10:30:00',
    grossProfitKnownAmount: 8,
    grossProfitComplete: true,
    itemsWithoutHistoricalCost: 0,
    items: [
      { productId: 8, productName: 'Café', quantity: 2, unitPrice: 14.99, subtotal: 29.98 },
    ],
  },
  {
    id: 40,
    total: 6.5,
    status: 'COMPLETED',
    createdAt: '2026-10-20T09:15:00',
    grossProfitKnownAmount: 1.5,
    grossProfitComplete: true,
    itemsWithoutHistoricalCost: 0,
    items: [
      { productId: 12, productName: 'Pão', quantity: 5, unitPrice: 1.3, subtotal: 6.5 },
    ],
  },
]

describe('SalesPage', () => {
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
    getSalesMock.mockReset()
    getSaleByIdMock.mockReset()
  })

  afterEach(() => {
    act(() => root.unmount())
    queryClient.clear()
    container.remove()
    document.body.innerHTML = ''
  })

  async function render(initialEntry = '/sales') {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/sales/:saleId" element={<SalesPage />} />
            </Routes>
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

  it('carrega vendas com identificador, data, itens, total e status', async () => {
    getSalesMock.mockResolvedValueOnce(sales)

    await render()
    await waitForText('#41')

    expect(document.body.textContent).toContain('25/10/2026')
    expect(document.body.textContent).toContain(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(29.98),
    )
    expect(document.body.textContent).toContain('Concluída')
    expect(document.body.textContent).toContain('Lucro bruto do período:')
    expect(document.body.textContent).toContain(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(9.5),
    )
    expect(getSalesMock).toHaveBeenCalledTimes(1)
  })

  it('shows known sale profit but marks it incomplete when historical costs are missing', async () => {
    getSalesMock.mockResolvedValueOnce([{
      ...sales[0],
      grossProfitKnownAmount: 3.25,
      grossProfitComplete: false,
      itemsWithoutHistoricalCost: 1,
    }])

    await render()
    await waitForText('Incompleto')

    expect(document.body.textContent).toContain('1 sem custo')
    expect(document.body.textContent).toContain('1 item(ns) sem custo histórico')
  })

  it('sums known gross profit in cents for the displayed period', async () => {
    getSalesMock.mockResolvedValueOnce([
      { ...sales[0], grossProfitKnownAmount: 0.1 },
      { ...sales[1], grossProfitKnownAmount: 0.2 },
    ])

    await render()
    await waitForText('#41')

    expect(document.body.textContent).toContain(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(0.3),
    )
  })

  it('filtra por intervalo local, valida datas e limpa os filtros sem repetir a requisição', async () => {
    getSalesMock.mockResolvedValueOnce(sales)

    await render()
    await waitForText('#41')

    const startDate = container.querySelector<HTMLInputElement>('input[name="startDate"]')
    const endDate = container.querySelector<HTMLInputElement>('input[name="endDate"]')
    expect(startDate).not.toBeNull()
    expect(endDate).not.toBeNull()

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(startDate, '2026-10-22')
      startDate?.dispatchEvent(new Event('input', { bubbles: true }))
      startDate?.dispatchEvent(new Event('change', { bubbles: true }))
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(endDate, '2026-10-26')
      endDate?.dispatchEvent(new Event('input', { bubbles: true }))
      endDate?.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(document.body.textContent).toContain('#41')
    expect(document.body.textContent).not.toContain('#40')

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(endDate, '2026-10-21')
      endDate?.dispatchEvent(new Event('input', { bubbles: true }))
      endDate?.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(document.body.textContent).toContain('A data final não pode ser anterior')
    expect(endDate?.getAttribute('min')).toBe('2026-10-22')

    const clearButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Limpar filtros'),
    )
    await act(async () => clearButton?.click())
    expect(document.body.textContent).toContain('#40')
    expect(getSalesMock).toHaveBeenCalledTimes(1)
  })

  it('informa quando não há resultados', async () => {
    getSalesMock.mockResolvedValueOnce([])

    await render()
    await waitForText('Ainda não há vendas registradas.')

    expect(document.body.textContent).toContain('Ainda não há vendas registradas.')
  })

  it('trata erro na listagem e permite repetir a consulta', async () => {
    getSalesMock.mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce(sales)

    await render()
    await waitForText('Não foi possível carregar o histórico de vendas.')

    const retryButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Tentar novamente'),
    )
    await act(async () => retryButton?.click())
    await waitForText('#41')
    expect(getSalesMock).toHaveBeenCalledTimes(2)
  })

  it('abre detalhes usando o endpoint por venda e exibe os valores históricos retornados', async () => {
    getSaleByIdMock.mockResolvedValueOnce({
      ...sales[0],
      items: [
        { productId: 8, productName: 'Café', quantity: 2, unitPrice: 9.25, subtotal: 18.5 },
        { productId: 15, productName: 'Açúcar', quantity: 1, unitPrice: 3.75, subtotal: 3.75 },
      ],
      total: 22.25,
    })

    await render('/sales/41')
    await waitForText('Açúcar')

    const text = document.body.textContent ?? ''
    expect(text).toContain('Venda #41')
    expect(text).toContain('25/10/2026')
    expect(text).toContain('9,25')
    expect(text).toContain('18,50')
    expect(text).toContain('3,75')
    expect(text).toContain('22,25')
    expect(text).toContain('Lucro bruto')
    expect(text).toContain('R$ 8,00')
    expect(getSaleByIdMock).toHaveBeenCalledWith('41')
    expect(getSalesMock).not.toHaveBeenCalled()
  })

  it('exibe subtotal, desconto geral, total final e o preço negociado nos detalhes', async () => {
    getSaleByIdMock.mockResolvedValueOnce({
      ...sales[0],
      subtotal: 30,
      discountAmount: 2.5,
      total: 27.5,
      grossProfitKnownAmount: -1.25,
      items: [{ productId: 8, productName: 'Café', quantity: 2, unitPrice: 15, subtotal: 30 }],
    })

    await render('/sales/41')
    await waitForText('Desconto geral')

    const text = (document.body.textContent ?? '').replace(/\u00a0/g, ' ')
    expect(text).toContain('Subtotal')
    expect(text).toContain('R$ 30,00')
    expect(text).toContain('− R$ 2,50')
    expect(text).toContain('Total final')
    expect(text).toContain('R$ 27,50')
    expect(text).toContain('R$ 15,00')
    expect(text).toContain('-R$ 1,25')
  })

  it('exibe desconto zero em venda sem desconto', async () => {
    getSaleByIdMock.mockResolvedValueOnce({ ...sales[0], subtotal: 29.98, discountAmount: 0 })

    await render('/sales/41')
    await waitForText('Desconto geral')

    expect(document.body.textContent).toContain('Desconto geral')
    expect((document.body.textContent ?? '').replace(/\u00a0/g, ' ')).toContain('R$ 0,00')
  })

  it('não inventa subtotal nem desconto para respostas antigas', async () => {
    getSaleByIdMock.mockResolvedValueOnce(sales[0])

    await render('/sales/41')
    await waitForText('Total final')

    const text = (document.body.textContent ?? '').replace(/\u00a0/g, ' ')
    const labels = [...document.querySelectorAll('dt')].map((dt) => dt.textContent)
    expect(labels).not.toContain('Subtotal')
    expect(text).not.toContain('Desconto geral')
    expect(text).toContain('R$ 29,98')
  })

  it('trata erro ao carregar detalhes e disponibiliza volta ao histórico', async () => {
    getSaleByIdMock.mockRejectedValueOnce(new Error('network error'))

    await render('/sales/999')
    await waitForText('Não foi possível carregar os detalhes desta venda.')

    expect(Array.from(container.querySelectorAll('a')).some((link) => link.textContent === 'Voltar ao histórico'))
      .toBe(true)
  })
})
