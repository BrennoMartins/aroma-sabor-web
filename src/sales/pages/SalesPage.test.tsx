// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../shared/api/axios'
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
      {
        productId: 8,
        productName: 'Café',
        categoryId: 3,
        categoryName: 'Mercearia',
        quantity: 2,
        unitPrice: 14.99,
        unitCostPrice: 8.5,
        subtotal: 29.98,
        discountAllocatedAmount: 0,
      },
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
      {
        productId: 12,
        productName: 'Pão',
        categoryId: null,
        categoryName: null,
        quantity: 5,
        unitPrice: 1.3,
        unitCostPrice: 1,
        subtotal: 6.5,
        discountAllocatedAmount: 0,
      },
    ],
  },
]

function getIndicatorValues(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll('[aria-label="Indicadores do período"] strong'),
    (element) => element.textContent,
  )
}

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
    vi.restoreAllMocks()
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

  async function setDate(name: 'startDate' | 'endDate', value: string) {
    const field = container.querySelector<HTMLInputElement>(`input[name="${name}"]`)
    if (!field) {
      throw new Error(`Date field not found: ${name}`)
    }

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(field, value)
      field.dispatchEvent(new Event('input', { bubbles: true }))
      field.dispatchEvent(new Event('change', { bubbles: true }))
    })
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
    expect(document.body.textContent).toContain('Valor total de vendas')
    expect(document.body.textContent).toContain('Lucro bruto')
    expect(document.body.textContent).toContain('Quantidade de vendas')
    expect(document.body.textContent).toContain(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(9.5),
    )
    expect(document.body.textContent).toContain('R$ 36,48')
    expect(container.querySelector('[aria-label="Indicadores do período"]')?.children).toHaveLength(3)
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
    await waitForText('Incompleto · 1 item(ns) sem custo histórico')

    expect(document.body.textContent).toContain('1 sem custo')
    expect(document.body.textContent).toContain('Lucro bruto conhecido')
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

  it('marks the period profit indeterminate when any completed sale has null profit', async () => {
    getSalesMock.mockResolvedValueOnce([
      { ...sales[0], grossProfitKnownAmount: 5.5 },
      { ...sales[1], grossProfitKnownAmount: null, grossProfitComplete: false, itemsWithoutHistoricalCost: 1 },
    ])

    await render()
    await waitForText('#41')

    const indicators = container.querySelector('[aria-label="Indicadores do período"]')
    expect(getIndicatorValues(container)).toEqual(['R$ 36,48', 'Lucro indeterminado', '2'])
    expect(indicators?.textContent).toContain('Dados históricos insuficientes para calcular com segurança.')
    expect(indicators?.textContent).not.toContain('R$ 5,50')
  })

  it('does not present a known subtotal when every completed sale profit is indeterminate', async () => {
    getSalesMock.mockResolvedValueOnce(sales.map((sale) => ({
      ...sale,
      grossProfitKnownAmount: null,
      grossProfitComplete: false,
      itemsWithoutHistoricalCost: 1,
    })))

    await render()
    await waitForText('#41')

    expect(getIndicatorValues(container)[1]).toBe('Lucro indeterminado')
    expect(container.querySelector('[aria-label="Indicadores do período"]')?.textContent)
      .not.toContain('R$ 0,00')
  })

  it('updates all indicators using the same inclusive date filters as the history', async () => {
    getSalesMock.mockResolvedValueOnce(sales)

    await render()
    await waitForText('#41')
    expect(getIndicatorValues(container)).toEqual(['R$ 36,48', 'R$ 9,50', '2'])

    await setDate('startDate', '2026-10-25')
    expect(getIndicatorValues(container)).toEqual(['R$ 29,98', 'R$ 8,00', '1'])
    expect(document.body.textContent).not.toContain('#40')

    await setDate('startDate', '')
    expect(getIndicatorValues(container)).toEqual(['R$ 36,48', 'R$ 9,50', '2'])
  })

  it('uses net sale totals and known historical gross profit, excluding non-completed sales', async () => {
    getSalesMock.mockResolvedValueOnce([
      {
        ...sales[0],
        id: 50,
        subtotal: 30,
        discountAmount: 4,
        total: 26,
        grossProfitKnownAmount: 5.5,
      },
      {
        ...sales[0],
        id: 51,
        status: 'CANCELLED',
        total: 80,
        grossProfitKnownAmount: null,
        grossProfitComplete: false,
      },
      {
        ...sales[1],
        id: 52,
        status: 'PENDING',
        total: 50,
        grossProfitKnownAmount: null,
        grossProfitComplete: false,
      },
    ])

    await render()
    await waitForText('#50')

    const indicators = container.querySelector('[aria-label="Indicadores do período"]')
    expect(getIndicatorValues(container)).toEqual(['R$ 26,00', 'R$ 5,50', '1'])
    expect(indicators?.textContent).not.toContain('R$ 80,00')
    expect(indicators?.textContent).not.toContain('R$ 50,00')
  })

  it('renders three responsive indicator cards with zeros when the selected period has no sales', async () => {
    getSalesMock.mockResolvedValueOnce(sales)

    await render()
    await waitForText('#41')
    await setDate('startDate', '2026-11-01')

    const indicators = container.querySelector('[aria-label="Indicadores do período"]')
    expect(indicators?.children).toHaveLength(3)
    expect(indicators?.className).toContain('metrics')
    expect(getIndicatorValues(container)).toEqual(['R$ 0,00', 'R$ 0,00', '0'])
    expect(document.body.textContent).toContain('Nenhuma venda encontrada para o período selecionado.')
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

  it('renderiza calendários nativos e filtra cada limite opcionalmente, incluindo os dias limites', async () => {
    getSalesMock.mockResolvedValueOnce([
      { ...sales[0], id: 46, createdAt: '2026-10-24T23:59:59' },
      { ...sales[0], id: 47, createdAt: '2026-10-25T00:00:00' },
      { ...sales[0], id: 48, createdAt: '2026-10-25T23:59:59' },
      { ...sales[0], id: 49, createdAt: '2026-10-26T00:00:00' },
    ])

    await render()
    await waitForText('#49')

    const startDate = container.querySelector<HTMLInputElement>('input[name="startDate"]')
    const endDate = container.querySelector<HTMLInputElement>('input[name="endDate"]')
    expect(startDate?.type).toBe('date')
    expect(endDate?.type).toBe('date')
    expect(document.body.textContent).not.toContain(
      'A API não oferece paginação nem filtros por data. O histórico é carregado integralmente e as datas são filtradas localmente.',
    )

    await setDate('startDate', '2026-10-25')
    expect(document.body.textContent).not.toContain('#46')
    expect(document.body.textContent).toContain('#47')
    expect(document.body.textContent).toContain('#48')
    expect(document.body.textContent).toContain('#49')
    expect(getIndicatorValues(container)[2]).toBe('3')

    await setDate('startDate', '')
    await setDate('endDate', '2026-10-25')
    expect(document.body.textContent).toContain('#46')
    expect(document.body.textContent).toContain('#47')
    expect(document.body.textContent).toContain('#48')
    expect(document.body.textContent).not.toContain('#49')
    expect(getIndicatorValues(container)[2]).toBe('3')

    await setDate('startDate', '2026-10-25')
    expect(document.body.textContent).not.toContain('#46')
    expect(document.body.textContent).toContain('#47')
    expect(document.body.textContent).toContain('#48')
    expect(document.body.textContent).not.toContain('#49')
    expect(getIndicatorValues(container)[2]).toBe('2')

    await setDate('startDate', '')
    expect(document.body.textContent).toContain('#46')
    expect(document.body.textContent).toContain('#47')
    expect(document.body.textContent).toContain('#48')
    expect(document.body.textContent).not.toContain('#49')
    expect(getIndicatorValues(container)[2]).toBe('3')

    await setDate('endDate', '')
    expect(document.body.textContent).toContain('#46')
    expect(document.body.textContent).toContain('#47')
    expect(document.body.textContent).toContain('#48')
    expect(document.body.textContent).toContain('#49')
    expect(getIndicatorValues(container)[2]).toBe('4')
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
        {
          productId: 8,
          productName: 'Café',
          categoryId: 3,
          categoryName: 'Mercearia',
          quantity: 2,
          unitPrice: 9.25,
          unitCostPrice: 4.5,
          subtotal: 18.5,
          discountAllocatedAmount: 1,
        },
        {
          productId: 15,
          productName: 'Açúcar',
          categoryId: 3,
          categoryName: 'Mercearia',
          quantity: 1,
          unitPrice: 3.75,
          unitCostPrice: 2,
          subtotal: 3.75,
          discountAllocatedAmount: 0.5,
        },
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
    expect(text).toContain('Mercearia')
    expect(text).toContain('Custo unitário histórico')
    expect(text).toContain('Desconto alocado')
    expect(text).toContain('R$ 4,50')
    expect(text).toContain('R$ 1,00')
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
      items: [{
        productId: 8,
        productName: 'Café',
        categoryId: 3,
        categoryName: 'Mercearia',
        quantity: 2,
        unitPrice: 15,
        unitCostPrice: 7,
        subtotal: 30,
        discountAllocatedAmount: 2.5,
      }],
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

  it('renders missing historical item data without querying the current catalog', async () => {
    getSaleByIdMock.mockResolvedValueOnce({
      ...sales[0],
      grossProfitKnownAmount: null,
      grossProfitComplete: false,
      itemsWithoutHistoricalCost: 1,
      items: [{
        productId: 90,
        productName: null,
        categoryId: null,
        categoryName: null,
        quantity: 1,
        unitPrice: 5,
        unitCostPrice: null,
        subtotal: 5,
        discountAllocatedAmount: null,
      }],
    })

    await render('/sales/41')
    await waitForText('Produto sem nome histórico')

    const text = document.body.textContent ?? ''
    expect(text).toContain('Não registrada')
    expect(text).toContain('Não registrado')
    expect(text).toContain('Lucro indeterminado')
    expect(text).toContain('Faltam dados históricos para calcular o lucro com segurança.')
    expect(text).not.toContain('R$ 0,00')
    expect(getSaleByIdMock).toHaveBeenCalledWith('41')
    expect(getSalesMock).not.toHaveBeenCalled()
  })

  it('exibe placeholders para campos omitidos após validação da resposta antiga', async () => {
    const actualApi = await vi.importActual<typeof import('../services/salesApi')>('../services/salesApi')
    vi.spyOn(api, 'get').mockResolvedValueOnce({
      data: {
        ...sales[0],
        grossProfitKnownAmount: null,
        grossProfitComplete: false,
        itemsWithoutHistoricalCost: 1,
        items: [{ productId: 90, quantity: 1, unitPrice: 5, subtotal: 5 }],
      },
    })
    getSaleByIdMock.mockImplementationOnce(actualApi.getSaleById)

    await render('/sales/41')
    await waitForText('Produto sem nome histórico')

    const row = container.querySelector('tbody tr')
    expect(row?.textContent).toContain('Produto sem nome histórico')
    expect(row?.textContent).toContain('Não registrada')
    expect(Array.from(row?.querySelectorAll('td') ?? []).map((cell) => cell.textContent))
      .toEqual(['Não registrada', '1', 'R$ 5,00', 'Não registrado', 'R$ 5,00', 'Não registrado'])
    expect(document.body.textContent).toContain('Lucro indeterminado')
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.get).toHaveBeenCalledWith('/sales/41')
  })

  it('exibe custo histórico e desconto alocado zero como valores registrados', async () => {
    const actualApi = await vi.importActual<typeof import('../services/salesApi')>('../services/salesApi')
    vi.spyOn(api, 'get').mockResolvedValueOnce({
      data: {
        ...sales[0],
        grossProfitKnownAmount: 0,
        items: [{ ...sales[0].items[0], unitCostPrice: 0, discountAllocatedAmount: 0 }],
      },
    })
    getSaleByIdMock.mockImplementationOnce(actualApi.getSaleById)

    await render('/sales/41')
    await waitForText('Café')

    const cells = Array.from(container.querySelectorAll('tbody tr td'), (cell) => cell.textContent)
    expect(cells[3]).toBe('R$ 0,00')
    expect(cells[5]).toBe('R$ 0,00')
    expect(document.body.textContent).not.toContain('Lucro indeterminado')
    const profitLabel = Array.from(container.querySelectorAll('dt')).find((label) => label.textContent === 'Lucro bruto')
    expect(profitLabel?.nextElementSibling?.textContent).toBe('R$ 0,00')
    expect(api.get).toHaveBeenCalledTimes(1)
  })

  it('trata erro ao carregar detalhes e disponibiliza volta ao histórico', async () => {
    getSaleByIdMock.mockRejectedValueOnce(new Error('network error'))

    await render('/sales/999')
    await waitForText('Não foi possível carregar os detalhes desta venda.')

    expect(Array.from(container.querySelectorAll('a')).some((link) => link.textContent === 'Voltar ao histórico'))
      .toBe(true)
  })
})
