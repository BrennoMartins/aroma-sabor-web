import { useSyncExternalStore } from 'react'
import { getToastsSnapshot, subscribeToasts } from './toast-store'

export function ToastViewport() {
  const activeToasts = useSyncExternalStore(subscribeToasts, getToastsSnapshot, getToastsSnapshot)

  return (
    <div className="ui-toast-stack" aria-live="polite" aria-atomic="true">
      {activeToasts.map((toastItem) => (
        <div key={toastItem.id} className={`ui-toast ui-toast--${toastItem.variant}`}>
          {toastItem.message}
        </div>
      ))}
    </div>
  )
}