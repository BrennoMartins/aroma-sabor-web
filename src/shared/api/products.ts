import { api } from './axios'

export type Product = {
  id: number
  name: string
  price: number
  barcode: string
}

export async function getByBarcode(barcode: string) {
  const response = await api.get<Product>(`/products/barcode/${barcode}`)

  return response.data
}