import { api } from '../../shared/api/axios'

export type ProductRecord = {
  id: number
  name: string
  barcode: string
  category: string | null
  price: number
  stockQuantity: number
}

export type CreateProductRequest = {
  barcode: string
  name: string
  category: string
  price: number
  stockQuantity: number
}

export async function getProductByBarcode(barcode: string) {
  const response = await api.get<ProductRecord>(`/products/barcode/${barcode}`)

  return response.data
}

export async function createProduct(payload: CreateProductRequest) {
  const response = await api.post<ProductRecord>('/products', payload)

  return response.data
}
