import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { ScannerContext } from './ScannerContext'
import type { BarcodeScanListener } from './scanner.types'

const SCANNER_MAX_AVERAGE_INTERVAL_MS = 30

function clearScannerState(
  bufferRef: React.MutableRefObject<string>,
  timestampsRef: React.MutableRefObject<number[]>,
) {
  bufferRef.current = ''
  timestampsRef.current = []
}

function isPrintableKey(event: KeyboardEvent) {
  if (event.ctrlKey || event.altKey || event.metaKey) {
    return false
  }

  return event.key.length === 1
}

function getAverageInterval(timestamps: number[]) {
  if (timestamps.length < 2) {
    return Number.POSITIVE_INFINITY
  }

  let totalInterval = 0

  for (let index = 1; index < timestamps.length; index += 1) {
    totalInterval += timestamps[index] - timestamps[index - 1]
  }

  return totalInterval / (timestamps.length - 1)
}

export function BarcodeScannerProvider({ children }: PropsWithChildren) {
  const [lastBarcode, setLastBarcode] = useState<string | null>(null)
  const bufferRef = useRef('')
  const timestampsRef = useRef<number[]>([])
  const listenersRef = useRef(new Set<BarcodeScanListener>())

  const onScan = useCallback((listener: BarcodeScanListener) => {
    listenersRef.current.add(listener)

    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  useEffect(() => {
    const listeners = listenersRef.current

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        const barcode = bufferRef.current

        if (!barcode) {
          clearScannerState(bufferRef, timestampsRef)
          return
        }

        const averageInterval = getAverageInterval(timestampsRef.current)

        if (averageInterval <= SCANNER_MAX_AVERAGE_INTERVAL_MS) {
          setLastBarcode(barcode)

          listeners.forEach((listener) => {
            listener(barcode)
          })
        }

        clearScannerState(bufferRef, timestampsRef)
        return
      }

      if (event.key === 'Backspace') {
        bufferRef.current = bufferRef.current.slice(0, -1)
        timestampsRef.current = timestampsRef.current.slice(0, -1)
        return
      }

      if (!isPrintableKey(event)) {
        return
      }

      bufferRef.current += event.key
      timestampsRef.current = [...timestampsRef.current, performance.now()]
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      listeners.clear()
      clearScannerState(bufferRef, timestampsRef)
    }
  }, [])

  return <ScannerContext.Provider value={{ lastBarcode, onScan }}>{children}</ScannerContext.Provider>
}