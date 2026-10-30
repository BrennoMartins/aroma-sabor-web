import { z } from 'zod'
import { api } from '../../shared/api/axios'

export type ProductRecord = {
  id: number
  name: string
  barcode: string
  categoryId: number | null
  category: string | null
  price: number
  costPrice: number | null
  stockQuantity: number
  active: boolean
}

export type CreateProductRequest = {
  barcode: string
  name: string
  categoryId: number
  price: number
  costPrice?: number | null
  stock: number
}

export type UpdateProductRequest = Omit<CreateProductRequest, 'stock'>

export type ProductCatalogParams = {
  search: string
  active: boolean
  categoryId?: number
  page: number
  size: number
}

export type ProductCatalogResponse = {
  content: ProductRecord[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type StockReplenishmentRequest = {
  quantity: number
  reason?: string
}

export type StockAdjustmentRequest = {
  quantityOnHand: number
  reason: string
}

export const STOCK_DISCARD_REASONS = ['DAMAGED', 'EXPIRED', 'UNFIT_FOR_SALE', 'OTHER'] as const
export type StockDiscardReason = (typeof STOCK_DISCARD_REASONS)[number]

export type StockDiscardRequest = {
  quantity: number
  reason: StockDiscardReason
  observation?: string
}

const StockDiscardResponseSchema = z.object({
  id: z.number().int().positive(),
  productId: z.number().int().positive(),
  productName: z.string(),
  movementType: z.literal('DISCARD'),
  quantity: z.number().int().negative(),
  createdAt: z.string(),
  reason: z.string().nullable(),
  discardReason: z.enum(STOCK_DISCARD_REASONS),
  referenceSaleId: z.number().nullable(),
})

export type StockDiscardResponse = z.infer<typeof StockDiscardResponseSchema>

type ProductResponse = {
  id: number
  name: string
  barcode: string
  category: { id: number; name: string } | null
  price: number
  costPrice: number | null
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
    costPrice: product.costPrice ?? null,
    stockQuantity: product.stock,
    active: product.active,
  }
}

export async function getProducts() {
  const response = await api.get<ProductResponse[]>('/products')

  return response.data.map(mapProductResponse)
}

export async function getInactiveProducts() {
  const response = await api.get<ProductResponse[]>('/products/inactive')

  return response.data.map(mapProductResponse)
}

export async function getProductCatalog(params: ProductCatalogParams, signal?: AbortSignal) {
  const response = await api.get<Omit<ProductCatalogResponse, 'content'> & { content: ProductResponse[] }>(
    '/products/catalog',
    {
      params,
      signal,
    },
  )

  return {
    ...response.data,
    content: response.data.content.map(mapProductResponse),
  }
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
  const response = await api.put<ProductResponse>(`/products/${id}`, payload)

  return mapProductResponse(response.data)
}

export async function deactivateProduct(id: number) {
  await api.delete<void>(`/products/${id}`)
}

export async function reactivateProduct(id: number) {
  const response = await api.post<ProductResponse>(`/products/${id}/reactivate`)

  return mapProductResponse(response.data)
}

export async function replenishProduct(id: number, payload: StockReplenishmentRequest) {
  const response = await api.post<ProductResponse>(`/products/${id}/replenishments`, payload)

  return mapProductResponse(response.data)
}

export async function adjustProductStock(id: number, payload: StockAdjustmentRequest) {
  const response = await api.post<ProductResponse>(`/products/${id}/stock-adjustments`, payload)

  return mapProductResponse(response.data)
}

export async function discardProductStock(id: number, payload: StockDiscardRequest) {
  const response = await api.post<unknown>(`/products/${id}/discards`, payload)

  return StockDiscardResponseSchema.parse(response.data)
}
