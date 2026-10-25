import { Button } from '../Button/Button'
import { Modal } from '../Modal/Modal'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'danger' | 'success' | 'secondary'
  isConfirming?: boolean
  confirmingLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmVariant = 'primary',
  isConfirming = false,
  confirmingLabel = 'Processando...',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={isConfirming ? () => undefined : onCancel}
      actions={
        <>
          <Button variant="secondary" disabled={isConfirming} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} loading={isConfirming} onClick={onConfirm}>
            {isConfirming ? confirmingLabel : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="ui-confirm-dialog__description">{description}</p>
    </Modal>
  )
}