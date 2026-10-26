import { z } from 'zod'
import { api } from '../../shared/api/axios'

const StockMovementSchema = z.object({
  id: z.number(),
  productId: z.number(),
  productName: z.string(),
  movementType: z.enum(['SALE', 'ENTRY', 'ADJUSTMENT']),
  quantity: z.number().int(),
  createdAt: z.string(),
  reason: z.string().nullable(),
  referenceSaleId: z.number().nullable().optional(),
})

const StockMovementPageSchema = z.object({
  content: z.array(StockMovementSchema),
  number: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  first: z.boolean(),
  last: z.boolean(),
  empty: z.boolean(),
})

export type StockMovement = z.infer<typeof StockMovementSchema>
export type StockMovementPage = z.infer<typeof StockMovementPageSchema>
export type StockMovementFilters = {
  productId?: number
  movementType?: StockMovement['movementType']
  startDate?: string
  endDate?: string
  page: number
  size: number
}

export class InvalidStockMovementPageError extends Error {
  constructor() {
    super('Invalid stock movement page response')
    this.name = 'InvalidStockMovementPageError'
  }
}

export async function getStockMovements(filters: StockMovementFilters) {
  const response = await api.get<unknown>('/stock-movements', {
    params: {
      ...filters,
      productId: filters.productId || undefined,
      movementType: filters.movementType || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    },
  })
  const result = StockMovementPageSchema.safeParse(response.data)

  if (!result.success) {
    throw new InvalidStockMovementPageError()
  }

  return result.data
}
