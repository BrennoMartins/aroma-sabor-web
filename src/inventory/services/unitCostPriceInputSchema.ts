import { z } from 'zod'

export const unitCostPriceInputSchema = z
  .string()
  .trim()
  .min(1, 'Informe o custo unitário de compra.')
  .refine((value) => {
    const normalized = Number(value.replace(',', '.'))

    return /^\d{1,8}(?:[,.]\d{1,2})?$/.test(value)
      && Number.isFinite(normalized)
      && normalized <= 99999999.99
  }, 'Informe um custo válido, com até 2 casas decimais.')
  .transform((value) => Number(value.replace(',', '.')))
