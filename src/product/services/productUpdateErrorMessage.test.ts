import { describe, expect, it } from 'vitest'
import { getProductUpdateErrorMessage } from './productUpdateErrorMessage'

describe('getProductUpdateErrorMessage', () => {
  it('uses the validation message and field errors returned by the API', () => {
    expect(
      getProductUpdateErrorMessage({
        isAxiosError: true,
        response: {
          data: {
            message: 'Erro de validação.',
            errors: { name: 'não pode estar vazio', price: 'deve ser maior ou igual a zero' },
          },
        },
      }),
    ).toBe('Erro de validação. não pode estar vazio deve ser maior ou igual a zero')
  })

  it('uses a backend message for conflicts', () => {
    expect(
      getProductUpdateErrorMessage({
        isAxiosError: true,
        response: { data: { message: 'Produto já cadastrado.' } },
      }),
    ).toBe('Produto já cadastrado.')
  })

  it('uses a clear fallback for network or unexpected errors', () => {
    expect(getProductUpdateErrorMessage(new Error('network error'))).toBe(
      'Não foi possível atualizar o produto. Tente novamente.',
    )
  })
})
