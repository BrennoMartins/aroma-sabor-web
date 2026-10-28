import { z } from 'zod'
import { api } from './axios'

export type Product = {
  id: number
  name: string
  price: number
  barcode: string
}

const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number(),
  barcode: z.string(),
})

const ProductListSchema = z.array(ProductSchema)

export class InvalidProductResponseError extends Error {
  constructor() {
    super('Invalid product response')
    this.name = 'InvalidProductResponseError'
  }
}

export async function getByBarcode(barcode: string) {
  const response = await api.get<Product>(`/products/barcode/${barcode}`)

  const result = ProductSchema.safeParse(response.data)

  if (!result.success) {
    throw new InvalidProductResponseError()
  }

  return result.data
}

export async function searchProductsByName(name: string) {
  const response = await api.get<unknown>('/products/search', {
    params: { name },
  })
  const result = ProductListSchema.safeParse(response.data)

  if (!result.success) {
    throw new InvalidProductResponseError()
  }

  return result.data
}