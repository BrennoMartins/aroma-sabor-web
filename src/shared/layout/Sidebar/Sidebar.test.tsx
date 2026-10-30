// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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

  it('keeps Products and the other menu items without a separate Categories link', async () => {
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
  })
})
