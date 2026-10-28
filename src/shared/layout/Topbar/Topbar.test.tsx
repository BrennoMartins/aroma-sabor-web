// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Topbar } from './Topbar'

vi.mock('../../../turn/components/CloseMarketModal', () => ({
  CloseMarketModal: () => null,
}))

vi.mock('../../../turn/components/MarketStatus', () => ({
  MarketStatus: () => null,
}))

vi.mock('../../../turn/components/OpenMarketModal', () => ({
  OpenMarketModal: () => null,
}))

vi.mock('../../../turn/hooks/useMarketSession', () => ({
  useMarketSession: () => ({
    currentTurn: null,
    isOpen: false,
    isLoading: false,
    openMarket: vi.fn(),
    closeMarket: vi.fn(),
    isOpening: false,
    isClosing: false,
  }),
}))

describe('Topbar', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 27, 21, 35, 42))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root.render(<Topbar isSidebarOpen={false} onSidebarToggle={vi.fn()} />)
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.useRealTimers()
    container.remove()
  })

  it('exibe o relogio em horas e minutos e atualiza com o horario', () => {
    const clock = container.querySelector('[aria-label="Relogio do sistema"] strong')

    expect(clock?.textContent).toBe('21:35')
    expect(clock?.textContent).not.toContain(':42')

    act(() => {
      vi.advanceTimersByTime(18_000)
    })

    expect(clock?.textContent).toBe('21:36')
  })

  it('nao exibe status de conexao do scanner', () => {
    expect(container.textContent).not.toContain('Scanner Conectado')
    expect(container.querySelector('[aria-label="Status do scanner"]')).toBeNull()
  })
})
