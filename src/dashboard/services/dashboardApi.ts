import { z } from 'zod'
import { api } from '../../shared/api/axios'

const LocalDateTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/)

const DashboardSummarySchema = z.object({
  date: z.iso.date(),
  revenue: z.number(),
  salesCount: z.number(),
  averageTicket: z.number(),
  grossProfitKnownAmount: z.number().finite(),
  grossProfitComplete: z.boolean(),
  itemsWithoutHistoricalCost: z.number().int().nonnegative(),
  currentTurn: z.object({
    id: z.string(),
    openedAt: LocalDateTimeSchema,
  }).nullable(),
  recentSales: z.array(z.object({
    id: z.number(),
    createdAt: LocalDateTimeSchema,
    total: z.number(),
  })),
})

const TopProductSchema = z.object({
  productId: z.number(),
  productName: z.string(),
  quantitySold: z.number(),
})

const LowStockProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  barcode: z.string(),
  stock: z.number(),
})

export type DashboardSummary = z.infer<typeof DashboardSummarySchema>
export type TopProduct = z.infer<typeof TopProductSchema>
export type LowStockProduct = z.infer<typeof LowStockProductSchema>

export class InvalidDashboardSummaryError extends Error {
  constructor() {
    super('Invalid dashboard summary response')
    this.name = 'InvalidDashboardSummaryError'
  }
}

export class InvalidTopProductsResponseError extends Error {
  constructor() {
    super('Invalid top products response')
    this.name = 'InvalidTopProductsResponseError'
  }
}

export class InvalidLowStockResponseError extends Error {
  constructor() {
    super('Invalid low-stock response')
    this.name = 'InvalidLowStockResponseError'
  }
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await api.get<unknown>('/dashboard/summary')
  const result = DashboardSummarySchema.safeParse(response.data)

  if (!result.success) {
    throw new InvalidDashboardSummaryError()
  }

  return result.data
}

export async function getTopProducts(): Promise<TopProduct[]> {
  const response = await api.get<unknown>('/dashboard/top-products')
  const result = z.array(TopProductSchema).safeParse(response.data)

  if (!result.success) {
    throw new InvalidTopProductsResponseError()
  }

  return result.data
}

export async function getLowStockProducts(): Promise<LowStockProduct[]> {
  const response = await api.get<unknown>('/dashboard/low-stock')
  const result = z.array(LowStockProductSchema).safeParse(response.data)

  if (!result.success) {
    throw new InvalidLowStockResponseError()
  }

  return result.data
}
