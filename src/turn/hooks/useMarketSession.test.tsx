// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMarketSession } from './useMarketSession'
import type { MarketSession } from '../types/marketSession'

const getCurrentTurnMock = vi.fn()
const openTurnMock = vi.fn()
const closeTurnMock = vi.fn()
const toastSuccessMock = vi.fn()
const toastInfoMock = vi.fn()

vi.mock('../services/turnApi', () => ({
  getCurrentTurn: (...args: unknown[]) => getCurrentTurnMock(...args),
  openTurn: (...args: unknown[]) => openTurnMock(...args),
  closeTurn: (...args: unknown[]) => closeTurnMock(...args),
}))

vi.mock('../../shared/components/Toast/toast-store', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    info: (...args: unknown[]) => toastInfoMock(...args),
    error: vi.fn(),
  },
}))

function createAxiosError(status: number) {
  return {
    isAxiosError: true,
    response: { status },
    code: 'ERR_BAD_REQUEST',
  }
}

function createTurn(id = 'turn-1'): MarketSession {
  return {
    id,
    openedAt: '2026-09-29T09:22:45.000Z',
    closedAt: null,
    operatorName: 'Operador 1',
    status: 'OPEN',
    openingNote: 'Abertura normal',
    closingNote: null,
    durationInMinutes: null,
  }
}

function Harness() {
  const session = useMarketSession()
  const [actionMessage, setActionMessage] = useState('')

  useEffect(() => {
    ;(window as typeof window & { __marketSession__?: ReturnType<typeof useMarketSession> }).__marketSession__ = session
  }, [session])

  return (
    <div>
      <span data-testid="status">{session.isOpen ? 'open' : 'closed'}</span>
      <span data-testid="turn-id">{session.currentTurn?.id ?? 'none'}</span>
      <span data-testid="error">{session.error ?? ''}</span>
      <span data-testid="message">{actionMessage}</span>
      <button
        type="button"
        onClick={async () => {
          try {
            await session.openMarket({ operatorName: 'Joao', openingNote: 'inicio' })
            setActionMessage('opened')
          } catch (error) {
            setActionMessage(error instanceof Error ? error.message : 'error')
          }
        }}
      >
        open
      </button>
      <button
        type="button"
        onClick={async () => {
          try {
            await session.closeMarket({ closingNote: 'fim' })
            setActionMessage('closed')
          } catch (error) {
            setActionMessage(error instanceof Error ? error.message : 'error')
          }
        }}
      >
        close
      </button>
    </div>
  )
}

async function flush() {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
  await Promise.resolve()
}

async function clickByText(text: string) {
  const button = Array.from(document.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === text)

  if (!button) {
    throw new Error(`Button not found: ${text}`)
  }

  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
  })
}

async function waitForText(selector: string, expectedText: string) {
  for (let index = 0; index < 10; index += 1) {
    if (document.querySelector(selector)?.textContent === expectedText) {
      return
    }

    await flush()
  }

  throw new Error(`Timed out waiting for ${selector} to become ${expectedText}`)
}

describe('useMarketSession', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    getCurrentTurnMock.mockReset()
    openTurnMock.mockReset()
    closeTurnMock.mockReset()
    toastSuccessMock.mockReset()
    toastInfoMock.mockReset()
  })

  afterEach(() => {
    root.unmount()
    container.remove()
    document.body.innerHTML = ''
  })

  async function render() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Harness />
        </QueryClientProvider>,
      )

      await flush()
      await flush()
    })
  }

  it('mostra mercado fechado quando nao ha turno aberto', async () => {
    getCurrentTurnMock.mockResolvedValueOnce(null)

    await render()

    await waitForText('[data-testid="status"]', 'closed')

    expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('closed')
    expect(document.querySelector('[data-testid="turn-id"]')?.textContent).toBe('none')
  })

  it('abre turno com sucesso', async () => {
    const turn = createTurn()
    getCurrentTurnMock.mockResolvedValueOnce(null)
    openTurnMock.mockResolvedValueOnce(turn)

    await render()

    await waitForText('[data-testid="status"]', 'closed')

    await clickByText('open')

    await waitForText('[data-testid="status"]', 'open')

    expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('open')
    expect(document.querySelector('[data-testid="turn-id"]')?.textContent).toBe(turn.id)
    expect(toastSuccessMock).toHaveBeenCalledWith('Mercado aberto. Turno iniciado com sucesso.')
  })

  it('trata conflito 409 ao abrir turno', async () => {
    const turn = createTurn('turn-2')
    getCurrentTurnMock.mockResolvedValueOnce(null).mockResolvedValueOnce(turn)
    openTurnMock.mockRejectedValueOnce(createAxiosError(409))

    await render()

    await waitForText('[data-testid="status"]', 'closed')

    await clickByText('open')

    await waitForText('[data-testid="status"]', 'open')

    expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('open')
    expect(document.querySelector('[data-testid="turn-id"]')?.textContent).toBe(turn.id)
    expect(toastInfoMock).toHaveBeenCalledWith('O mercado ja foi aberto em outro dispositivo. Atualizando o status.')
  })

  it('mantem erro amigavel ao abrir turno com falha', async () => {
    getCurrentTurnMock.mockResolvedValueOnce(null)
    openTurnMock.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } })

    await render()

    await waitForText('[data-testid="status"]', 'closed')

    await clickByText('open')

    expect(document.querySelector('[data-testid="message"]')?.textContent).toBe('error')
    expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('closed')
  })

  it('fecha turno com sucesso', async () => {
    const turn = createTurn()
    getCurrentTurnMock.mockResolvedValueOnce(turn)
    closeTurnMock.mockResolvedValueOnce({
      id: turn.id,
      openedAt: turn.openedAt,
      closedAt: '2026-09-29T10:00:00.000Z',
      status: 'CLOSED',
      closingNote: 'fim',
      durationInMinutes: 38,
    })

    await render()

    await waitForText('[data-testid="status"]', 'open')

    await clickByText('close')

    await waitForText('[data-testid="status"]', 'closed')

    expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('closed')
    expect(document.querySelector('[data-testid="turn-id"]')?.textContent).toBe('none')
    expect(toastSuccessMock).toHaveBeenCalledWith('Mercado fechado com sucesso.')
  })

  it('mantem erro amigavel ao fechar turno com falha', async () => {
    const turn = createTurn()
    getCurrentTurnMock.mockResolvedValueOnce(turn)
    closeTurnMock.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } })

    await render()

    await waitForText('[data-testid="status"]', 'open')

    await clickByText('close')

    expect(document.querySelector('[data-testid="message"]')?.textContent).toBe('error')
    expect(document.querySelector('[data-testid="status"]')?.textContent).toBe('open')
  })
})