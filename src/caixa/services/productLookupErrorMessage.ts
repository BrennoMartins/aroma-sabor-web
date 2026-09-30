import { isAxiosError } from 'axios'
import { InvalidProductResponseError } from '../../shared/api/products'

export function getProductLookupErrorMessage(error: unknown) {
  if (error instanceof InvalidProductResponseError) {
    return 'Resposta invalida da API. Tente novamente.'
  }

  if (!isAxiosError(error)) {
    return 'Nao foi possivel consultar o produto.'
  }

  if (error.code === 'ECONNABORTED') {
    return 'Tempo esgotado na consulta do produto. Tente novamente.'
  }

  const status = error.response?.status

  if (status && status >= 500) {
    return 'Servico indisponivel no momento. Tente novamente.'
  }

  if (status && status >= 400) {
    return 'Produto nao encontrado.'
  }

  return 'Nao foi possivel consultar o produto.'
}