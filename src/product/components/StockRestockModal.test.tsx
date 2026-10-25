// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductRecord } from '../services/productApi'
import { StockRestockModal } from './StockRestockModal'

const product: ProductRecord = {
  id: 1,
  name: 'Café especial',
  barcode: '7891000000001',
  categoryId: 7,
  category: 'Mercearia',
  price: 18.5,
  stockQuantity: 12,
  active: true,
}

describe('StockRestockModal', () => {
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

  it('mostra o estoque atual, informa a indisponibilidade e não oferece envio falso', async () => {
    const onClose = vi.fn()

    await act(async () => {
      root.render(<StockRestockModal open product={product} onClose={onClose} />)
    })

    expect(document.body.textContent).toContain('Estoque atual')
    expect(document.body.textContent).toContain('12')
    expect(document.body.textContent).toContain('O backend ainda não oferece uma operação')
    expect(document.body.querySelector('input')).toBeNull()
    expect(Array.from(document.body.querySelectorAll('button')).map((button) => button.textContent?.trim())).toEqual([
      'Fechar',
    ])
  })
})
