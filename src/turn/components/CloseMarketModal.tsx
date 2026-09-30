import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../shared/components/Button/Button'
import { Modal } from '../../shared/components/Modal/Modal'
import { useMarketElapsedTime, formatMarketElapsedTime } from '../hooks/useMarketSession'
import type { MarketSession, CloseMarketPayload } from '../types/marketSession'
import styles from './CloseMarketModal.module.css'

type CloseMarketModalProps = {
  open: boolean
  turn: MarketSession | null
  isSubmitting: boolean
  errorMessage: string | null
  onClose: () => void
  onConfirm: (payload: CloseMarketPayload) => void
}

const closeMarketSchema = z.object({
  closingNote: z.string().trim().min(2, 'Informe uma observacao de fechamento.'),
})

type CloseMarketFormValues = z.infer<typeof closeMarketSchema>

export function CloseMarketModal({ open, turn, isSubmitting, errorMessage, onClose, onConfirm }: CloseMarketModalProps) {
  const { elapsedTime, elapsedSeconds } = useMarketElapsedTime(turn?.openedAt)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setFocus,
  } = useForm<CloseMarketFormValues>({
    resolver: zodResolver(closeMarketSchema),
    defaultValues: {
      closingNote: '',
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }

    reset({
      closingNote: '',
    })

    window.requestAnimationFrame(() => {
      setFocus('closingNote')
    })
  }, [open, reset, setFocus])

  const duration = turn?.openedAt ? elapsedTime : formatMarketElapsedTime(elapsedSeconds)

  const submitForm = (values: CloseMarketFormValues) => {
    onConfirm({
      closingNote: values.closingNote.trim(),
    })
  }

  return (
    <Modal
      open={open}
      title="Encerrar mercado"
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" form="close-market-form" loading={isSubmitting}>
            Fechar Mercado
          </Button>
        </>
      }
    >
      <form id="close-market-form" className={styles.body} onSubmit={handleSubmit(submitForm)}>
        <p className={styles.message}>Deseja encerrar o turno atual?</p>

        <dl className={styles.summary}>
          <div>
            <dt>Operador</dt>
            <dd>{turn?.operatorName ?? 'Nao informado'}</dd>
          </div>
          <div>
            <dt>Duracao do turno</dt>
            <dd>{duration}</dd>
          </div>
          <div>
            <dt>Observacao de abertura</dt>
            <dd>{turn?.openingNote?.trim() ? turn.openingNote : 'Sem observacao'}</dd>
          </div>
        </dl>

        <label className={styles.field}>
          <span className={styles.label}>Observacao de fechamento</span>
          <textarea
            className={styles.textarea}
            rows={3}
            placeholder="Ex.: fechamento do caixa e encerramento do atendimento"
            {...register('closingNote')}
          />
        </label>

        {errors.closingNote ? (
          <p className={styles.errorMessage} role="alert">
            {errors.closingNote.message}
          </p>
        ) : null}

        {errorMessage ? (
          <p className={styles.errorMessage} role="alert">
            {errorMessage}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
