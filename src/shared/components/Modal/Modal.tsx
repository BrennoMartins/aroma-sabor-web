import { useEffect, type PropsWithChildren, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ModalProps = PropsWithChildren<{
  open: boolean
  title?: string
  actions?: ReactNode
  onClose: () => void
}>

export function Modal({ open, title, actions, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="ui-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="ui-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        {title ? <h3 className="ui-modal__title">{title}</h3> : null}
        <div className="ui-modal__body">{children}</div>
        {actions ? <div className="ui-modal__actions">{actions}</div> : null}
      </section>
    </div>,
    document.body,
  )
}