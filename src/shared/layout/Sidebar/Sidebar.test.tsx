// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Sidebar } from './Sidebar'

describe('Sidebar navigation', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    document.body.innerHTML = ''
  })

  it('shows only operational navigation items and no future section', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <Sidebar isOpen isDesktop onClose={() => undefined} />
        </MemoryRouter>,
      )
    })

    const links = Array.from(container.querySelectorAll('nav a')).map((link) => link.textContent?.trim())
    expect(links).toEqual([
      'Dashboard',
      'Caixa',
      'Produtos',
      'Estoque',
      'Perdas e descartes',
      'Vendas',
      'Relatórios',
    ])
    expect(container.querySelector('a[href="/products"]')?.textContent).toContain('Produtos')
    expect(container.querySelector('a[href="/categories"]')).toBeNull()
    expect(container.textContent).not.toContain('FUTURO')
    expect(container.textContent).not.toContain('Futuro')
    expect(container.textContent).not.toContain('Configurações')
    expect(container.querySelector('a[href="/settings"]')).toBeNull()
  })

  it('preserves mobile navigation links and closes the menu after navigation', async () => {
    const onClose = vi.fn()
    await act(async () => {
      root.render(
        <MemoryRouter>
          <Sidebar isOpen isDesktop={false} onClose={onClose} />
        </MemoryRouter>,
      )
    })

    expect(container.querySelectorAll('nav a')).toHaveLength(7)
    await act(async () => {
      container.querySelector<HTMLAnchorElement>('a[href="/inventory"]')?.click()
    })

    expect(onClose).toHaveBeenCalledOnce()
  })
})
