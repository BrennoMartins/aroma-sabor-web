import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DASHBOARD_LOW_STOCK_QUERY_KEY } from '../../dashboard/hooks/useDashboardProducts'
import { PRODUCT_CATALOG_QUERY_KEY, PRODUCTS_QUERY_KEY } from '../../product/hooks/useProducts'
import {
  adjustProductStock,
  discardProductStock,
  replenishProduct,
  type ProductRecord,
  type StockAdjustmentRequest,
  type StockDiscardRequest,
  type StockReplenishmentRequest,
} from '../../product/services/productApi'
import { toast } from '../../shared/components/Toast/toast-store'
import { getInventoryErrorMessage } from '../services/inventoryErrorMessage'
import { STOCK_MOVEMENTS_QUERY_KEY } from './useStockMovements'

function useStockMutation<TPayload>(
  operation: 'replenishment' | 'adjustment',
  mutationFn: (input: { id: number; payload: TPayload }) => Promise<ProductRecord>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TPayload }) => mutationFn({ id, payload }),
    onSuccess: async (updatedProduct) => {
      queryClient.setQueryData<ProductRecord[]>(PRODUCTS_QUERY_KEY, (products) =>
        products?.map((product) => (product.id === updatedProduct.id ? updatedProduct : product)),
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY, exact: true }),
        queryClient.invalidateQueries({ queryKey: PRODUCT_CATALOG_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_LOW_STOCK_QUERY_KEY }),
      ])
      toast.success(operation === 'replenishment' ? 'Reposição registrada com sucesso.' : 'Ajuste de estoque registrado com sucesso.')
    },
    onError: (error) => {
      toast.error(getInventoryErrorMessage(error, operation))
    },
  })
}

export function useReplenishStock() {
  return useStockMutation<StockReplenishmentRequest>('replenishment', ({ id, payload }) =>
    replenishProduct(id, payload),
  )
}

export function useAdjustStock() {
  return useStockMutation<StockAdjustmentRequest>('adjustment', ({ id, payload }) =>
    adjustProductStock(id, payload),
  )
}

export function useDiscardStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: StockDiscardRequest }) =>
      discardProductStock(id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY, exact: true }),
        queryClient.invalidateQueries({ queryKey: PRODUCT_CATALOG_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_LOW_STOCK_QUERY_KEY }),
      ])
      toast.success('Descarte registrado com sucesso.')
    },
    onError: (error) => {
      toast.error(getInventoryErrorMessage(error, 'discard'))
    },
  })
}
