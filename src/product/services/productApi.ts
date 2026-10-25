import { api } from '../../shared/api/axios'

export type ProductRecord = {
  id: number
  name: string
  barcode: string
  categoryId: number | null
  category: string | null
  price: number
  stockQuantity: number
  active: boolean
}

export type CreateProductRequest = {
  barcode: string
  name: string
  categoryId: number
  price: number
  stock: number
}

export type UpdateProductRequest = Omit<CreateProductRequest, 'stock'>

type ProductResponse = {
  id: number
  name: string
  barcode: string
  category: { id: number; name: string } | null
  price: number
  stock: number
  active: boolean
}

function mapProductResponse(product: ProductResponse): ProductRecord {
  return {
    id: product.id,
    name: product.name,
    barcode: product.barcode,
    categoryId: product.category?.id ?? null,
    category: product.category?.name ?? null,
    price: product.price,
    stockQuantity: product.stock,
    active: product.active,
  }
}

export async function getProducts() {
  const response = await api.get<ProductResponse[]>('/products')

  return response.data.map(mapProductResponse)
}

export async function getProductByBarcode(barcode: string) {
  const response = await api.get<ProductResponse>(`/products/barcode/${barcode}`)

  return mapProductResponse(response.data)
}

export async function getProductById(id: number) {
  const response = await api.get<ProductResponse>(`/products/${id}`)

  return mapProductResponse(response.data)
}

export async function createProduct(payload: CreateProductRequest) {
  const response = await api.post<ProductResponse>('/products', payload)

  return mapProductResponse(response.data)
}

export async function updateProduct(id: number, payload: UpdateProductRequest) {
  const currentProduct = await getProductById(id)
  const response = await api.put<ProductResponse>(`/products/${id}`, {
    ...payload,
    stock: currentProduct.stockQuantity,
  })

  return mapProductResponse(response.data)
}

export async function deactivateProduct(id: number) {
  await api.delete<void>(`/products/${id}`)
}
