import { useContext } from 'react'
import { ScannerContext } from './ScannerContext'

export function useBarcodeScanner() {
  const context = useContext(ScannerContext)

  if (!context) {
    throw new Error('useBarcodeScanner must be used within BarcodeScannerProvider')
  }

  return context
}