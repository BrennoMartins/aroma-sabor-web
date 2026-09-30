// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MarketStatus } from './MarketStatus'

describe('MarketStatus', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-29T12:00:00.000Z'))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('mostra mercado fechado quando nao existe turno aberto', () => {
    act(() => {
      root.render(<MarketStatus turn={null} />)
    })

    expect(document.body.textContent).toContain('Mercado Fechado')
  })

  it('mostra o tempo real do turno aberto e atualiza com o timer', () => {
    const turn = {
      id: 'turn-1',
      openedAt: '2026-09-29T09:22:45.000Z',
      closedAt: null,
      operatorName: 'Operador 1',
      status: 'OPEN' as const,
      openingNote: 'Abertura normal',
      closingNote: null,
      durationInMinutes: null,
    }

    act(() => {
      root.render(<MarketStatus turn={turn} />)
    })

    expect(document.body.textContent).toContain('Mercado Aberto')
    expect(document.body.textContent).toContain('02:37:15')

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(document.body.textContent).toContain('02:37:16')
  })
})