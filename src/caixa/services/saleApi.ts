import { api } from '../../shared/api/axios'
import { z } from 'zod'

export type SaleItemPayload = {
  productId: number
  quantity: number
}

export type CreateSaleRequest = {
  items: SaleItemPayload[]
}

export type CreateSaleResponse = {
  id: number
  total: number
}

const CreateSaleResponseSchema = z.object({
  id: z.number(),
  total: z.number(),
})

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