import { Button } from '../../shared/components/Button/Button'
import { Modal } from '../../shared/components/Modal/Modal'
import styles from './CloseMarketModal.module.css'

type CloseMarketModalProps = {
  open: boolean
  duration: string
  onClose: () => void
  onConfirm: () => void
}

export function CloseMarketModal({ open, duration, onClose, onConfirm }: CloseMarketModalProps) {
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
          <Button type="button" variant="danger" onClick={onConfirm}>
            Fechar Mercado
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <p className={styles.message}>Deseja encerrar o turno?</p>
        <p className={styles.duration}>Duração do turno: {duration}</p>
      </div>
    </Modal>
  )
}
