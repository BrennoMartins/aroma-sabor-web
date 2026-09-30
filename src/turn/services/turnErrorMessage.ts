import { isAxiosError } from 'axios'

export function isTurnConflict(error: unknown) {
  return isAxiosError(error) && error.response?.status === 409
}

export function getTurnErrorMessage(error: unknown) {
  if (!isAxiosError(error)) {
    return 'Nao foi possivel concluir a operacao do turno.'
  }

  if (error.code === 'ECONNABORTED') {
    return 'Tempo esgotado ao processar o turno. Tente novamente.'
  }

  const status = error.response?.status

  if (status === 409) {
    return 'O mercado ja foi aberto em outro dispositivo. Atualizando o status.'
  }

  if (status === 404) {
    return 'Nao foi encontrado um turno aberto para concluir a operacao.'
  }

  if (status && status >= 500) {
    return 'Servico indisponivel no momento. Tente novamente.'
  }

  if (status && status >= 400) {
    return 'Nao foi possivel concluir o turno com os dados informados.'
  }

  return 'Erro de rede ao processar o turno. Verifique a conexao e tente novamente.'
}