import { describe, expect, it } from 'vitest'
import { InvalidProductResponseError } from '../../shared/api/products'
import { getProductLookupErrorMessage } from './productLookupErrorMessage'

function createAxiosLikeError(overrides: Record<string, unknown> = {}) {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: 'request failed',
    code: undefined,
    response: undefined,
    ...overrides,
  }
}

describe('getProductLookupErrorMessage', () => {
  it('mapeia timeout para mensagem amigavel', () => {
    const error = createAxiosLikeError({ code: 'ECONNABORTED' })

    expect(getProductLookupErrorMessage(error)).toBe('Tempo esgotado na consulta do produto. Tente novamente.')
  })

  it('mapeia erro 4xx para produto nao encontrado', () => {
    const error = createAxiosLikeError({ response: { status: 404 } })

    expect(getProductLookupErrorMessage(error)).toBe('Produto nao encontrado.')
  })

  it('mapeia erro 5xx para indisponibilidade', () => {
    const error = createAxiosLikeError({ response: { status: 500 } })

    expect(getProductLookupErrorMessage(error)).toBe('Servico indisponivel no momento. Tente novamente.')
  })

  it('mapeia resposta invalida da API', () => {
    expect(getProductLookupErrorMessage(new InvalidProductResponseError())).toBe(
      'Resposta invalida da API. Tente novamente.',
    )
  })
})