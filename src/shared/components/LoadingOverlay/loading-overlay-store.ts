export type LoadingState = {
  visible: boolean
  message: string
}

let loadingState: LoadingState = {
  visible: false,
  message: 'Processando...',
}

const listeners = new Set<() => void>()

function emitChange() {
  listeners.forEach((listener) => listener())
}

export function subscribeLoadingOverlay(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function getLoadingOverlaySnapshot() {
  return loadingState
}

export const loadingOverlay = {
  show(message = 'Processando...') {
    loadingState = { visible: true, message }
    emitChange()
  },
  hide() {
    loadingState = { ...loadingState, visible: false }
    emitChange()
  },
}