export type ToastVariant = 'success' | 'error' | 'info'

export type ToastRecord = {
  id: number
  message: string
  variant: ToastVariant
}

let sequence = 0
let toasts: ToastRecord[] = []
const listeners = new Set<() => void>()

function emitChange() {
  listeners.forEach((listener) => listener())
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function getToastsSnapshot() {
  return toasts
}

function showToast(variant: ToastVariant, message: string) {
  const id = sequence += 1
  toasts = [...toasts, { id, message, variant }]
  emitChange()

  window.setTimeout(() => {
    toasts = toasts.filter((toastItem) => toastItem.id !== id)
    emitChange()
  }, 3200)
}

export const toast = {
  success(message: string) {
    showToast('success', message)
  },
  error(message: string) {
    showToast('error', message)
  },
  info(message: string) {
    showToast('info', message)
  },
}