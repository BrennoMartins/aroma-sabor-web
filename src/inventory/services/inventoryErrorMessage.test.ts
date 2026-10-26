import { describe, expect, it } from 'vitest'
import { getInventoryErrorMessage } from './inventoryErrorMessage'

describe('getInventoryErrorMessage', () => {
  it('explica que um ajuste sem diferença não foi persistido', () => {
    expect(
      getInventoryErrorMessage(
        { isAxiosError: true, response: { status: 409 } },
        'adjustment',
      ),
    ).toContain('já corresponde ao saldo atual')
  })

  it('informa conflitos e falhas de conexão sem expor detalhes técnicos', () => {
    expect(
      getInventoryErrorMessage(
        { isAxiosError: true, response: { status: 409 } },
        'reactivation',
      ),
    ).toContain('conflito no código de barras')
    expect(getInventoryErrorMessage(new Error('network failure'), 'replenishment')).toContain('conexão')
  })
})
