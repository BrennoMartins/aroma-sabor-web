import { isAxiosError } from 'axios'
import { InvalidCreateSaleResponseError } from './saleApi'

export function getCheckoutErrorMessage(error: unknown) {
  if (error instanceof InvalidCreateSaleResponseError) {
    return 'Resposta invalida ao finalizar venda. Tente novamente.'
  }

  if (!isAxiosError(error)) {
    return 'Nao foi possivel concluir a venda.'
  }

  if (error.code === 'ECONNABORTED') {
    return 'Tempo esgotado ao finalizar venda. Tente novamente.'
  }

  const status = error.response?.status

  if (status && status >= 500) {
    return 'Servico indisponivel no momento. Tente novamente.'
  }

  if (status && status >= 400) {
    return 'Nao foi possivel concluir a venda com os dados informados.'
  }

  return 'Erro de rede ao finalizar venda. Verifique a conexao e tente novamente.'
}
