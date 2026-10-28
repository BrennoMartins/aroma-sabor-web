import { useCallback, useEffect, useRef, type PropsWithChildren } from 'react'
import { ScannerContext } from './ScannerContext'
import type { BarcodeScanListener } from './scanner.types'
import {
  createBarcodeScannerTracker,
  DEFAULT_BARCODE_SCANNER_CONFIG,
} from './scannerDetector'

export function BarcodeScannerProvider({ children }: PropsWithChildren) {
  const detectorRef = useRef(createBarcodeScannerTracker(DEFAULT_BARCODE_SCANNER_CONFIG))
  const listenersRef = useRef(new Set<BarcodeScanListener>())

  const onScan = useCallback((listener: BarcodeScanListener) => {
    if (listenersRef.current.has(listener)) {
      return () => {
        listenersRef.current.delete(listener)
      }
    }

    listenersRef.current.add(listener)

    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  useEffect(() => {
    const detector = detectorRef.current
    const listeners = listenersRef.current

    const handleKeyDown = (event: KeyboardEvent) => {
      const barcode = detector.handleKey({
        key: event.key,
        timeStamp: event.timeStamp,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      })

      if (!barcode) {
        return
      }

      listeners.forEach((listener) => {
        listener(barcode)
      })
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      listeners.clear()
      detector.reset()
    }
  }, [])

  return (
    <ScannerContext.Provider value={{ onScan }}>
      {children}
    </ScannerContext.Provider>
  )
}