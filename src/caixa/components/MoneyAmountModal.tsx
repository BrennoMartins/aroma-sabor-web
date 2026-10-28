import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../../shared/components/Button/Button'
import { Input } from '../../shared/components/Input/Input'
import { Modal } from '../../shared/components/Modal/Modal'
import { formatMoneyInput, parseMoneyInputToCents } from '../utils/money'
import styles from './MoneyAmountModal.module.css'

type MoneyAmountModalProps = {
  title: string
  label: string
  initialValue: number | null
  details?: ReactNode
  confirmLabel: string
  // Returns an error message, or null when the amount (in cents) is acceptable.
  validate: (cents: number) => string | null
  onConfirm: (cents: number) => void
  onClose: () => void
  onRemove?: () => void
  removeLabel?: string
}

const FORM_ID = 'money-amount-form'

// Mount only while visible: the draft text is initialised on mount, so cancelling keeps the confirmed value.
export function MoneyAmountModal({
  title,
  label,
  initialValue,
  details,
  confirmLabel,
  validate,
  onConfirm,
  onClose,
  onRemove,
  removeLabel = 'Remover',
}: MoneyAmountModalProps) {
  const [draft, setDraft] = useState(initialValue === null ? '' : formatMoneyInput(initialValue))
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cents = parseMoneyInputToCents(draft)

    if (cents === null) {
      setError('Informe um valor valido em reais, com no maximo duas casas decimais.')
      return
    }

    const validationError = validate(cents)

    if (validationError) {
      setError(validationError)
      return
    }

    onConfirm(cents)
  }

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      actions={
        <>
          {onRemove ? (
            <Button type="button" variant="danger" onClick={onRemove}>
              {removeLabel}
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} variant="success">
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className={styles.form} onSubmit={handleSubmit} noValidate>
        {details ? <div className={styles.details}>{details}</div> : null}
        <Input
          label={label}
          name="money-amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus
          value={draft}
          error={error ?? undefined}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            setDraft(event.target.value)
            setError(null)
          }}
        />
      </form>
    </Modal>
  )
}
