import { api } from '../../shared/api/axios'

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

export async function createSale(payload: CreateSaleRequest) {
  const response = await api.post<CreateSaleResponse>('/sales', payload)

  return response.data
}