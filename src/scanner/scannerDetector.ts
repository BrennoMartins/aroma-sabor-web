export type BarcodeScannerConfig = Readonly<{
  maxKeyIntervalMs: number
  minBarcodeLength: number
  bufferTimeoutMs: number
}>

export type BarcodeKeyEventLike = Readonly<{
  key: string
  timeStamp: number
  ctrlKey?: boolean
  altKey?: boolean
  metaKey?: boolean
}>

export const DEFAULT_BARCODE_SCANNER_CONFIG: BarcodeScannerConfig = {
  maxKeyIntervalMs: 30,
  minBarcodeLength: 3,
  bufferTimeoutMs: 250,
} as const

function isModifierKey(key: string): boolean {
  return ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(key)
}

function isFunctionKey(key: string): boolean {
  return /^F\d+$/.test(key)
}

function isNonPrintableKey(event: BarcodeKeyEventLike): boolean {
  if (event.ctrlKey || event.altKey || event.metaKey) {
    return true
  }

  if (isModifierKey(event.key) || isFunctionKey(event.key)) {
    return true
  }

  return event.key.length !== 1
}

export type BarcodeScannerTracker = Readonly<{
  handleKey: (event: BarcodeKeyEventLike) => string | null
  reset: () => void
  getBuffer: () => string
}>

export function createBarcodeScannerTracker(
  config: BarcodeScannerConfig = DEFAULT_BARCODE_SCANNER_CONFIG,
): BarcodeScannerTracker {
  let buffer = ''
  let timestamps: number[] = []
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const clearBuffer = () => {
    buffer = ''
    timestamps = []

    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  const scheduleBufferClear = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      clearBuffer()
    }, config.bufferTimeoutMs)
  }

  const maybeCompleteScan = () => {
    const barcode = buffer.trim()

    if (barcode.length === 0) {
      clearBuffer()
      return null
    }

    if (barcode.length < config.minBarcodeLength) {
      clearBuffer()
      return null
    }

    if (timestamps.length < 2) {
      clearBuffer()
      return null
    }

    const intervals = timestamps.slice(1).map((timestamp, index) => timestamp - timestamps[index])
    const averageInterval =
      intervals.reduce((total, interval) => total + interval, 0) / intervals.length
    const maxInterval = intervals.reduce(
      (largest, interval) => (interval > largest ? interval : largest),
      0,
    )

    const isScannerLike =
      averageInterval <= config.maxKeyIntervalMs && maxInterval <= config.maxKeyIntervalMs

    clearBuffer()

    return isScannerLike ? barcode : null
  }

  const handleKey = (event: BarcodeKeyEventLike): string | null => {
    if (event.key === 'Enter') {
      return maybeCompleteScan()
    }

    if (isNonPrintableKey(event)) {
      return null
    }

    if (timestamps.length > 0) {
      const lastTimestamp = timestamps[timestamps.length - 1]

      if (event.timeStamp - lastTimestamp > config.bufferTimeoutMs) {
        clearBuffer()
        return null
      }
    }

    buffer += event.key
    timestamps = [...timestamps, event.timeStamp]
    scheduleBufferClear()

    return null
  }

  return {
    handleKey,
    reset: clearBuffer,
    getBuffer: () => buffer,
  }
}
