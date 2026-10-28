import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './axios'
import { InvalidProductResponseError, searchProductsByName } from './products'

vi.mock('./axios', () => ({
  api: {
    get: vi.fn(),
  },
}))

describe('searchProductsByName', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('uses the existing partial-name endpoint and validates matching products', async () => {
    const products = [
      { id: 2, name: 'CAFÉ TORRADO', price: 12.5, barcode: '7892' },
      { id: 3, name: 'CAFÉ SOLÚVEL', price: 8.25, barcode: '7893' },
    ]
    vi.mocked(api.get).mockResolvedValueOnce({ data: products })

    await expect(searchProductsByName('cafe')).resolves.toEqual(products)
    expect(api.get).toHaveBeenCalledWith('/products/search', {
      params: { name: 'cafe' },
    })
  })

  it('rejects malformed search responses', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [{ id: '2', name: 'CAFÉ TORRADO', price: 12.5, barcode: '7892' }],
    })

    await expect(searchProductsByName('cafe')).rejects.toBeInstanceOf(InvalidProductResponseError)
  })
})
