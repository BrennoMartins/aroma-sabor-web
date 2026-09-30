import { describe, expect, it } from 'vitest'
import { InvalidCreateSaleResponseError } from './saleApi'
import { getCheckoutErrorMessage } from './checkoutErrorMessage'

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

describe('getCheckoutErrorMessage', () => {
  it('mapeia timeout para mensagem amigavel', () => {
    const error = createAxiosLikeError({ code: 'ECONNABORTED' })

    expect(getCheckoutErrorMessage(error)).toBe('Tempo esgotado ao finalizar venda. Tente novamente.')
  })

  it('mapeia erro 4xx para mensagem amigavel', () => {
    const error = createAxiosLikeError({ response: { status: 400 } })

    expect(getCheckoutErrorMessage(error)).toBe('Nao foi possivel concluir a venda com os dados informados.')
  })

  it('mapeia erro 5xx para indisponibilidade', () => {
    const error = createAxiosLikeError({ response: { status: 503 } })

    expect(getCheckoutErrorMessage(error)).toBe('Servico indisponivel no momento. Tente novamente.')
  })

  it('mapeia erro de resposta invalida', () => {
    expect(getCheckoutErrorMessage(new InvalidCreateSaleResponseError())).toBe(
      'Resposta invalida ao finalizar venda. Tente novamente.',
    )
  })

  it('mapeia erro de rede para mensagem de conexao', () => {
    const error = createAxiosLikeError()

    expect(getCheckoutErrorMessage(error)).toBe(
      'Erro de rede ao finalizar venda. Verifique a conexao e tente novamente.',
    )
  })
})
