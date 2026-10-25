// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { InventoryPage } from './InventoryPage'

describe('InventoryPage', () => {
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

  it('documenta a ausência de endpoints de ajuste, reposição e histórico sem simular persistência', async () => {
    await act(async () => {
      root.render(<InventoryPage />)
    })

    expect(container.textContent).toContain('backend ainda não disponibiliza um endpoint de reposição')
    expect(container.textContent).toContain('Nenhuma movimentação foi simulada ou gravada')
    expect(container.textContent).toContain('o backend não oferece uma operação de ajuste')
    expect(container.textContent).toContain('POST /api/products/{id}/stock-adjustments')
    expect(container.textContent).toContain('estoque esperado para detectar alterações concorrentes')
    expect(container.textContent).toContain('a tabela atual rejeita movimentações com quantidade zero')
    expect(container.textContent).toContain('registrar entradas de estoque')
    expect(container.textContent).toContain('consultar movimentações')
    expect(container.textContent).toContain('estoque anterior ou posterior')
    expect(container.textContent).toContain('SALE')
    expect(container.textContent).toContain('ENTRY')
    expect(container.textContent).toContain('ADJUSTMENT')
    expect(container.querySelector('form')).toBeNull()
    expect(container.querySelector('button')).toBeNull()
  })
})
