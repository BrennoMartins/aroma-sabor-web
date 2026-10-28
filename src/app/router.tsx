import { useRoutes } from 'react-router-dom'
import { CaixaPage } from '../caixa/pages/CaixaPage'
import { CategoryPage } from '../category/pages/CategoryPage'
import { DashboardPage } from '../dashboard/pages/DashboardPage'
import { InventoryPage } from '../inventory/pages/InventoryPage'
import { DiscardsPage } from '../inventory/pages/DiscardsPage'
import { ProductPage } from '../product/pages/ProductPage'
import { SalesPage } from '../sales/pages/SalesPage'
import { SalesReportPage } from '../sales/pages/SalesReportPage'
import { MainLayout } from '../shared/layout/MainLayout'

export function AppRouter() {
  return useRoutes([
    {
      path: '/',
      element: <MainLayout />,
      children: [
        {
          index: true,
          element: <DashboardPage />,
        },
        {
          path: 'caixa',
          element: <CaixaPage />,
        },
        {
          path: 'products',
          element: <ProductPage />,
        },
        {
          path: 'categories',
          element: <CategoryPage />,
        },
        {
          path: 'inventory',
          element: <InventoryPage />,
        },
        {
          path: 'losses',
          element: <DiscardsPage />,
        },
        {
          path: 'sales',
          element: <SalesPage />,
        },
        {
          path: 'sales/:saleId',
          element: <SalesPage />,
        },
        {
          path: 'reports/sales',
          element: <SalesReportPage />,
        },
      ],
    },
  ])
}