import { api } from '../../shared/api/axios'

export type CategoryRecord = {
  id: number
  name: string
  createdAt: string
}

export async function getCategories() {
  const response = await api.get<CategoryRecord[]>('/categories')

  return response.data
}
