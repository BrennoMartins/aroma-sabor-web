// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMarketSession } from '../hooks/useMarketSession'
import { getCloseTurnErrorMessage } from '../services/turnErrorMessage'
import type { MarketSession, TurnSummary } from '../types/marketSession'
import { CloseMarketModal } from './CloseMarketModal'
import { MarketStatus } from './MarketStatus'

const getCurrentTurnMock = vi.fn()
const getTurnSummaryMock = vi.fn()
const closeTurnMock = vi.fn()
const toastSuccessMock = vi.fn()

vi.mock('../services/turnApi', () => ({
  getCurrentTurn: (...args: unknown[]) => getCurrentTurnMock(...args),
  getTurnSummary: (...args: unknown[]) => getTurnSummaryMock(...args),
  openTurn: vi.fn(),
  closeTurn: (...args: unknown[]) => closeTurnMock(...args),
}))

vi.mock('../../shared/components/Toast/toast-store', () => ({
  toast: { success: (...args: unknown[]) => toastSuccessMock(...args), info: vi.fn(), error: vi.fn() },
}))

const turn: MarketSession = {
  id: 'turn-1',
  openedAt: '2026-09-29T09:22:45.000Z',
  closedAt: null,
  operatorName: 'Operador 1',
  status: 'OPEN',
  openingNote: 'Abertura',
  closingNote: null,
  durationInMinutes: null,
}

const summary: TurnSummary = {
  turnId: 'turn-1',
  status: 'OPEN',
  openedAt: turn.openedAt,
  closedAt: null,
  durationInMinutes: 90,
  salesCount: 12,
  totalRevenue: 340.5,
  averageTicket: 28.37,
  topProducts: [{ productId: 1, productName: 'Pao Frances', quantitySold: 30, revenue: 45 }],
  lowStockProductCount: 3,
}

function Harness() {
  const session = useMarketSession()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <MarketStatus turn={session.currentTurn} isLoading={session.isLoading} />
      <button type="button" onClick={() => setOpen(true)}>
        abrir-fechamento
      </button>
      <CloseMarketModal
        open={open}
        turn={session.currentTurn}
        isSubmitting={session.isClosing}
        errorMessage={error}
        onClose={() => setOpen(false)}
        onConfirm={async (payload) => {
          setError(null)
          try {
            await session.closeMarket(payload)
            setOpen(false)
          } catch (e) {
            setError(getCloseTurnErrorMessage(e))
          }
        }}
      />
    </div>
  )
}

const flush = async () => {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
}

async function settle() {
  await act(async () => {
    for (let i = 0; i < 5; i += 1) {
      await flush()
    }
  })
}

function buttonByText(text: string) {
  const button = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === text)

  if (!button) {
    throw new Error(`Button not found: ${text}`)
  }

  return button as HTMLButtonElement
}

async function click(text: string) {
  await act(async () => {
    buttonByText(text).dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await settle()
}

async function typeNote(value: string) {
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set

  await act(async () => {
    setter?.call(textarea, value)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('CloseMarketModal flow', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(async () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => window.setTimeout(cb, 0)) as typeof window.requestAnimationFrame
    getCurrentTurnMock.mockReset().mockResolvedValue(turn)
    getTurnSummaryMock.mockReset().mockResolvedValue(summary)
    closeTurnMock.mockReset()
    toastSuccessMock.mockReset()

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Harness />
        </QueryClientProvider>,
      )
    })
    await settle()
    await click('abrir-fechamento')
  })

  afterEach(() => {
    act(() => root.unmount())
    queryClient.clear()
    container.remove()
    document.body.innerHTML = ''
  })

  it('abre o modal, carrega e exibe o resumo e o aviso de confirmacao', () => {
    expect(document.body.textContent).toContain('Fechar Mercado')
    expect(document.body.textContent).toContain('Você está prestes a fechar o mercado.')
    expect(getTurnSummaryMock).toHaveBeenCalledWith('turn-1')
    expect(document.body.textContent).toContain('Pao Frances')
    expect(document.body.textContent).toContain('3 produtos com estoque baixo')
    expect(document.body.textContent).toContain('1h 30min')
    expect(buttonByText('Fechar Mercado').disabled).toBe(false)
    expect(closeTurnMock).not.toHaveBeenCalled()
  })

  it('bloqueia o fechamento até o resumo carregar e permite tentar novamente após erro', async () => {
    act(() => root.unmount())
    document.body.innerHTML = ''
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient.clear()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

    let rejectSummary: (reason?: unknown) => void = () => {}
    getTurnSummaryMock
      .mockReset()
      .mockReturnValueOnce(new Promise((_, reject) => {
        rejectSummary = reject
      }))
      .mockResolvedValueOnce(summary)

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <CloseMarketModal
            open
            turn={turn}
            isSubmitting={false}
            errorMessage={null}
            onClose={vi.fn()}
            onConfirm={vi.fn()}
          />
        </QueryClientProvider>,
      )
    })

    expect(buttonByText('Fechar Mercado').disabled).toBe(true)

    await act(async () => {
      rejectSummary(new Error('Falha de rede'))
      await flush()
    })
    await settle()

    expect(document.body.textContent).toContain('Não foi possível carregar o resumo do turno.')
    expect(buttonByText('Fechar Mercado').disabled).toBe(true)

    await click('Tentar novamente')

    expect(getTurnSummaryMock).toHaveBeenCalledTimes(2)
    expect(buttonByText('Fechar Mercado').disabled).toBe(false)
  })

  it('valida a observacao e impede envio invalido', async () => {
    await click('Fechar Mercado')

    expect(document.body.textContent).toContain('Informe uma observacao de fechamento.')
    expect(closeTurnMock).not.toHaveBeenCalled()
  })

  it('confirma, chama POST /close, evita duplo envio e passa para Mercado Fechado', async () => {
    let resolveClose: (value: unknown) => void = () => {}
    closeTurnMock.mockReturnValue(new Promise((resolve) => (resolveClose = resolve)))
    getCurrentTurnMock.mockClear()
    getCurrentTurnMock.mockResolvedValue(null)

    await typeNote('Fechamento ok')
    await click('Fechar Mercado')

    const confirm = Array.from(document.querySelectorAll('button')).find((b) => b.getAttribute('form') === 'close-market-form') as HTMLButtonElement
    expect(confirm.disabled).toBe(true)

    await act(async () => {
      document.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await settle()

    expect(closeTurnMock).toHaveBeenCalledTimes(1)
    expect(closeTurnMock).toHaveBeenCalledWith('turn-1', { closingNote: 'Fechamento ok' })

    await act(async () => {
      resolveClose({ id: 'turn-1', status: 'CLOSED' })
    })
    await settle()

    expect(getCurrentTurnMock).toHaveBeenCalled()
    expect(toastSuccessMock).toHaveBeenCalledWith('Mercado fechado com sucesso.')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.body.textContent).toContain('Mercado Fechado')
  })

  it('mantem o mercado aberto em erro e permite tentar novamente', async () => {
    closeTurnMock.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } })

    await typeNote('Fechamento ok')
    await click('Fechar Mercado')

    expect(document.body.textContent).toContain('Servico indisponivel no momento. Tente novamente.')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.body.textContent).toContain('Mercado Aberto')

    getCurrentTurnMock.mockResolvedValue(null)
    closeTurnMock.mockResolvedValueOnce({ id: 'turn-1', status: 'CLOSED' })
    await click('Fechar Mercado')

    expect(closeTurnMock).toHaveBeenCalledTimes(2)
    expect(document.body.textContent).toContain('Mercado Fechado')
  })
})
