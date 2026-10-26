import { isAxiosError } from 'axios'

type ProductUpdateErrorResponse = {
  message?: unknown
  errors?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getProductUpdateErrorMessage(error: unknown) {
  if (!isAxiosError<ProductUpdateErrorResponse>(error) || !isRecord(error.response?.data)) {
    return 'Não foi possível atualizar o produto. Tente novamente.'
  }

  const { message, errors } = error.response.data
  const fieldMessages =
    isRecord(errors) ?
      Object.values(errors).filter((fieldMessage): fieldMessage is string => typeof fieldMessage === 'string')
    : []

  if (fieldMessages.length) {
    return `${typeof message === 'string' ? message : 'Verifique os dados do produto.'} ${fieldMessages.join(' ')}`
  }

  if (typeof message === 'string' && message.trim()) {
    return message
  }

  return 'Não foi possível atualizar o produto. Tente novamente.'
}
