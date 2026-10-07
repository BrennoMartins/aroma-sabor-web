import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../shared/api/axios'
import { getTurnSummary } from './turnApi'

vi.mock('../../shared/api/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('getTurnSummary', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('busca o resumo do turno no endpoint correspondente', async () => {
    const summary = { turnId: 'turn-123' }
    vi.mocked(api.get).mockResolvedValueOnce({ data: summary })

    await expect(getTurnSummary('turn-123')).resolves.toBe(summary)
    expect(api.get).toHaveBeenCalledWith('/turns/turn-123/summary')
  })
})
