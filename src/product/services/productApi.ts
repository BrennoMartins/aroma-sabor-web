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
  categoryId: number
  price: number
  stock: number
}

type ProductResponse = {
  id: number
  name: string
  barcode: string
  category: { id: number; name: string } | null
  price: number
  stock: number
}

function mapProductResponse(product: ProductResponse): ProductRecord {
  return {
    id: product.id,
    name: product.name,
    barcode: product.barcode,
    category: product.category?.name ?? null,
    price: product.price,
    stockQuantity: product.stock,
  }
}

export async function getProductByBarcode(barcode: string) {
  const response = await api.get<ProductResponse>(`/products/barcode/${barcode}`)

  return mapProductResponse(response.data)
}

export async function createProduct(payload: CreateProductRequest) {
  const response = await api.post<ProductResponse>('/products', payload)

  return mapProductResponse(response.data)
}
