const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const MONEY_INPUT_PATTERN = /^\d+(?:[.,]\d{1,2})?$/

export function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

export function toCents(value: number) {
  return Math.round(value * 100)
}

export function fromCents(cents: number) {
  return cents / 100
}

// Returns integer cents, or null when the text is not a non-negative amount with up to 2 decimals.
export function parseMoneyInputToCents(input: string): number | null {
  const normalized = input.trim()

  if (!MONEY_INPUT_PATTERN.test(normalized)) {
    return null
  }

  return toCents(Number(normalized.replace(',', '.')))
}

export function formatMoneyInput(value: number) {
  return value.toFixed(2).replace('.', ',')
}
