import { z } from 'zod'
import { api } from '../../shared/api/axios'

const SaleItemSchema = z.object({
  productId: z.number(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  subtotal: z.number(),
})

const GrossProfitFieldsSchema = {
  grossProfitKnownAmount: z.number().finite().nullable(),
  grossProfitComplete: z.boolean(),
  itemsWithoutHistoricalCost: z.number().int().nonnegative(),
}

const SaleSchema = z.object({
  id: z.number(),
  subtotal: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional(),
  total: z.number(),
  status: z.string(),
  createdAt: z.string(),
  items: z.array(SaleItemSchema),
  ...GrossProfitFieldsSchema,
})

export type SaleItem = z.infer<typeof SaleItemSchema>
export type SaleRecord = z.infer<typeof SaleSchema>

export class InvalidSaleResponseError extends Error {
  constructor() {
    super('Invalid sale response')
    this.name = 'InvalidSaleResponseError'
  }
}

function parseSale(data: unknown) {
  const result = SaleSchema.safeParse(data)

  if (!result.success) {
    throw new InvalidSaleResponseError()
  }

  return result.data
}

export async function getSales() {
  const response = await api.get<unknown>('/sales')

  if (!Array.isArray(response.data)) {
    throw new InvalidSaleResponseError()
  }

  return response.data.map(parseSale)
}

export async function getSaleById(id: string) {
  const response = await api.get<unknown>(`/sales/${encodeURIComponent(id)}`)

  return parseSale(response.data)
}
