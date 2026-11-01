// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRouter } from './router'

vi.mock('../shared/layout/MainLayout', async () => {
  const { Outlet } = await import('react-router-dom')
  return { MainLayout: () => <Outlet /> }
})

vi.mock('../product/pages/ProductPage', () => ({
  ProductPage: () => <div data-testid="product-page">Product manager</div>,
}))

vi.mock('../dashboard/pages/DashboardPage', () => ({
  DashboardPage: () => <div data-testid="dashboard-page">Dashboard</div>,
}))

vi.mock('../caixa/pages/CaixaPage', () => ({
  CaixaPage: () => <div data-testid="caixa-page">Caixa</div>,
}))

vi.mock('../inventory/pages/InventoryPage', () => ({
  InventoryPage: () => <div data-testid="inventory-page">Inventory</div>,
}))

vi.mock('../inventory/pages/DiscardsPage', () => ({
  DiscardsPage: () => <div data-testid="discards-page">Discards</div>,
}))

vi.mock('../sales/pages/SalesPage', () => ({
  SalesPage: () => <div data-testid="sales-page">Sales</div>,
}))

vi.mock('../sales/pages/SalesReportPage', () => ({
  SalesReportPage: () => <div data-testid="sales-report-page">Sales report</div>,
}))

function LocationDisplay() {
  const location = useLocation()
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>
}

describe('AppRouter category compatibility', () => {
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

  it('redirects /categories to the Categories tab within Products', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/categories']}>
          <AppRouter />
          <LocationDisplay />
        </MemoryRouter>,
      )
    })

    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe('/products?tab=categories')
    expect(container.querySelector('[data-testid="product-page"]')?.textContent).toBe('Product manager')
  })

  it.each([
    ['/', 'dashboard-page'],
    ['/caixa', 'caixa-page'],
    ['/products', 'product-page'],
    ['/inventory', 'inventory-page'],
    ['/losses', 'discards-page'],
    ['/sales', 'sales-page'],
    ['/sales/42', 'sales-page'],
    ['/reports/sales', 'sales-report-page'],
  ])('keeps the operational route %s accessible', async (path, testId) => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <AppRouter />
        </MemoryRouter>,
      )
    })

    expect(container.querySelector(`[data-testid="${testId}"]`)).not.toBeNull()
  })
})
