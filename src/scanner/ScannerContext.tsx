import { createContext } from 'react'
import type { BarcodeScannerContextValue } from './scanner.types'

export const ScannerContext = createContext<BarcodeScannerContextValue | undefined>(undefined)