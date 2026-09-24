import { useRoutes } from 'react-router-dom'
import { CaixaPage } from '../caixa/pages/CaixaPage'
import { CategoryPage } from '../category/pages/CategoryPage'
import { InventoryPage } from '../inventory/pages/InventoryPage'
import { ProductPage } from '../product/pages/ProductPage'
import { SalesPage } from '../sales/pages/SalesPage'
import { MainLayout } from '../shared/layout/MainLayout/MainLayout'

export function AppRouter() {
  return useRoutes([
    {
      path: '/',
      element: <MainLayout />,
      children: [
        {
          index: true,
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
          path: 'sales',
          element: <SalesPage />,
        },
      ],
    },
  ])
}