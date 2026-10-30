import { api } from '../../shared/api/axios'
import { z } from 'zod'

export type SaleItemPayload = {
  productId: number
  quantity: number
  unitPrice: number
}

export type CreateSaleRequest = {
  items: SaleItemPayload[]
  discountAmount: number
}

const CreateSaleItemResponseSchema = z.object({
  productId: z.number(),
  unitPrice: z.number(),
  quantity: z.number().optional(),
  subtotal: z.number().optional(),
})

const CreateSaleResponseSchema = z.object({
  id: z.number(),
  total: z.number(),
  subtotal: z.number().optional(),
  discountAmount: z.number().optional(),
  items: z.array(CreateSaleItemResponseSchema).optional(),
  // Known gross profit may be negative when the general discount exceeds the known margin.
  grossProfitKnownAmount: z.number().finite().nullable().optional(),
  grossProfitComplete: z.boolean().optional(),
  itemsWithoutHistoricalCost: z.number().optional(),
})

export type CreateSaleResponse = z.infer<typeof CreateSaleResponseSchema>

export class InvalidCreateSaleResponseError extends Error {
  constructor() {
    super('Invalid create sale response')
    this.name = 'InvalidCreateSaleResponseError'
  }
}

export async function createSale(payload: CreateSaleRequest) {
  const response = await api.post<CreateSaleResponse>('/sales', payload)

  const result = CreateSaleResponseSchema.safeParse(response.data)

  if (!result.success) {
    throw new InvalidCreateSaleResponseError()
  }

  return result.data
}
