import { isAxiosError } from 'axios'
import { InvalidStockMovementPageError } from './stockMovementApi'

type ApiErrorResponse = {
  message?: unknown
  errors?: unknown
}

type StockOperation = 'replenishment' | 'adjustment' | 'discard' | 'reactivation'

export function getInventoryErrorMessage(error: unknown, operation: StockOperation) {
  if (error instanceof InvalidStockMovementPageError) {
    return 'O histórico recebido está em um formato inesperado. Tente novamente.'
  }

  if (!isAxiosError<ApiErrorResponse>(error)) {
    return operation === 'reactivation'
      ? 'Não foi possível reativar o produto. Tente novamente.'
      : 'Não foi possível atualizar o estoque. Verifique a conexão e tente novamente.'
  }

  const status = error.response?.status
  const apiMessage = error.response?.data?.message

  if (status === 409 && operation === 'adjustment') {
    return 'A quantidade informada já corresponde ao saldo atual. Nenhum ajuste foi realizado.'
  }
  if (status === 409 && operation === 'discard') {
    return typeof apiMessage === 'string' && apiMessage.trim()
      ? apiMessage
      : 'A quantidade a descartar não pode ser maior que o estoque disponível.'
  }
  if (status === 409 && operation === 'reactivation') {
    return 'Este produto já está ativo ou há um conflito no código de barras. Atualize a lista e tente novamente.'
  }
  if (status === 404) {
    return 'O produto não foi encontrado. Atualize a lista e tente novamente.'
  }
  if (status === 400 && typeof apiMessage === 'string' && apiMessage.trim()) {
    return apiMessage
  }
  if (status && status >= 500) {
    return 'Serviço indisponível no momento. Tente novamente.'
  }
  if (error.code === 'ECONNABORTED') {
    return 'Tempo esgotado ao comunicar com o servidor. Tente novamente.'
  }
  if (status) {
    return 'Não foi possível concluir a operação com os dados informados.'
  }

  return 'Erro de conexão. Verifique a rede e tente novamente.'
}
