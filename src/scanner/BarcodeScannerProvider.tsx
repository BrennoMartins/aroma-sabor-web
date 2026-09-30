import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { ScannerContext } from './ScannerContext'
import type { BarcodeScanListener } from './scanner.types'
import {
  createBarcodeScannerTracker,
  DEFAULT_BARCODE_SCANNER_CONFIG,
} from './scannerDetector'

export function BarcodeScannerProvider({ children }: PropsWithChildren) {
  const [lastBarcode, setLastBarcode] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const detectorRef = useRef(createBarcodeScannerTracker(DEFAULT_BARCODE_SCANNER_CONFIG))
  const listenersRef = useRef(new Set<BarcodeScanListener>())
  const scanStatusTimeoutRef = useRef<number | null>(null)

  const updateScanStatus = useCallback((nextValue: boolean) => {
    setIsScanning(nextValue)

    if (!nextValue) {
      return
    }

    if (scanStatusTimeoutRef.current !== null) {
      window.clearTimeout(scanStatusTimeoutRef.current)
    }

    scanStatusTimeoutRef.current = window.setTimeout(() => {
      setIsScanning(false)
      scanStatusTimeoutRef.current = null
    }, 500)
  }, [])

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
    const handleKeyDown = (event: KeyboardEvent) => {
      const barcode = detectorRef.current.handleKey({
        key: event.key,
        timeStamp: event.timeStamp,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      })

      if (!barcode) {
        return
      }

      setLastBarcode(barcode)
      updateScanStatus(true)
      listenersRef.current.forEach((listener) => {
        listener(barcode)
      })
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      listenersRef.current.clear()
      detectorRef.current.reset()

      if (scanStatusTimeoutRef.current !== null) {
        window.clearTimeout(scanStatusTimeoutRef.current)
      }
    }
  }, [updateScanStatus])

  return (
    <ScannerContext.Provider value={{ lastBarcode, onScan, isScanning }}>
      {children}
    </ScannerContext.Provider>
  )
}