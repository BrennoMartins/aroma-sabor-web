import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../shared/components/Button/Button'
import { Input } from '../../shared/components/Input/Input'
import { Modal } from '../../shared/components/Modal/Modal'
import type { OpenMarketPayload } from '../types/marketSession'
import styles from './OpenMarketModal.module.css'

type OpenMarketModalProps = {
  open: boolean
  isSubmitting: boolean
  errorMessage: string | null
  onClose: () => void
  onConfirm: (payload: OpenMarketPayload) => void
}

const openMarketSchema = z.object({
  operatorName: z.string().trim().min(2, 'Informe o nome do operador.'),
  openingNote: z.string().trim().optional(),
})

type OpenMarketFormValues = z.infer<typeof openMarketSchema>

export function OpenMarketModal({ open, isSubmitting, errorMessage, onClose, onConfirm }: OpenMarketModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setFocus,
  } = useForm<OpenMarketFormValues>({
    resolver: zodResolver(openMarketSchema),
    defaultValues: {
      operatorName: '',
      openingNote: '',
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }

    reset({
      operatorName: '',
      openingNote: '',
    })

    window.requestAnimationFrame(() => {
      setFocus('operatorName')
    })
  }, [open, reset, setFocus])

  const submitForm = (values: OpenMarketFormValues) => {
    onConfirm({
      operatorName: values.operatorName.trim(),
      openingNote: values.openingNote?.trim() || undefined,
    })
  }

  return (
    <Modal
      open={open}
      title="Abrir mercado"
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="success" form="open-market-form" loading={isSubmitting}>
            Abrir Mercado
          </Button>
        </>
      }
    >
      <form id="open-market-form" className={styles.form} onSubmit={handleSubmit(submitForm)}>
        <p className={styles.message}>Informe quem esta abrindo o mercado para registrar o inicio do turno.</p>

        <Input label="Operador" autoComplete="name" autoFocus {...register('operatorName')} error={errors.operatorName?.message} />

        <label className={styles.field}>
          <span className={styles.label}>Observacao (opcional)</span>
          <textarea
            className={styles.textarea}
            rows={3}
            placeholder="Ex.: abertura para reposicao e atendimento"
            {...register('openingNote')}
          />
        </label>

        {errorMessage ? (
          <p className={styles.errorMessage} role="alert">
            {errorMessage}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
