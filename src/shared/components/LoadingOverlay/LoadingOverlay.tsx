import { useSyncExternalStore } from 'react'
import { getLoadingOverlaySnapshot, subscribeLoadingOverlay } from './loading-overlay-store'

export function LoadingOverlayRoot() {
  const state = useSyncExternalStore(
    subscribeLoadingOverlay,
    getLoadingOverlaySnapshot,
    getLoadingOverlaySnapshot,
  )

  if (!state.visible) {
    return null
  }

  return (
    <div className="ui-loading-overlay" role="status" aria-live="polite">
      <div className="ui-loading-overlay__card">
        <span className="ui-loading-overlay__spinner" aria-hidden="true" />
        <strong>{state.message}</strong>
      </div>
    </div>
  )
}