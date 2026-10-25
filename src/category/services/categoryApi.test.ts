import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../shared/api/axios'
import { getCategories } from './categoryApi'

vi.mock('../../shared/api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}))

describe('getCategories', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('consulta a listagem real de categorias', async () => {
    const categories = [
      { id: 17, name: 'Mercearia', createdAt: '2026-10-25T16:10:22.410136' },
    ]
    vi.mocked(api.get).mockResolvedValueOnce({ data: categories })

    await expect(getCategories()).resolves.toBe(categories)
    expect(api.get).toHaveBeenCalledWith('/categories')
  })
})
