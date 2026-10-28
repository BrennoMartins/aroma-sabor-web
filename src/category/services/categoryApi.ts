import { api } from '../../shared/api/axios'

export type CategoryRecord = {
  id: number
  name: string
  createdAt: string
}

export type CreateCategoryRequest = {
  name: string
}

export async function getCategories() {
  const response = await api.get<CategoryRecord[]>('/categories')

  return response.data
}

export async function createCategory(payload: CreateCategoryRequest) {
  const response = await api.post<CategoryRecord>('/categories', payload)

  return response.data
}
