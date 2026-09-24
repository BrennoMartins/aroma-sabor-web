import { Button } from '../../shared/components/Button/Button'
import { Modal } from '../../shared/components/Modal/Modal'
import styles from './OpenMarketModal.module.css'

type OpenMarketModalProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function OpenMarketModal({ open, onClose, onConfirm }: OpenMarketModalProps) {
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
          <Button type="button" variant="success" onClick={onConfirm}>
            Abrir Mercado
          </Button>
        </>
      }
    >
      <p className={styles.message}>Deseja iniciar o turno do mercado?</p>
    </Modal>
  )
}
