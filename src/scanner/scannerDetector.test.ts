import { describe, expect, it } from 'vitest'
import { createBarcodeScannerTracker, DEFAULT_BARCODE_SCANNER_CONFIG } from './scannerDetector'

type KeyboardInput = {
  key: string
  timeStamp: number
  ctrlKey?: boolean
  altKey?: boolean
  metaKey?: boolean
}

function keyEvent(key: string, timeStamp: number, extra: Partial<KeyboardInput> = {}): KeyboardInput {
  return {
    key,
    timeStamp,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    ...extra,
  }
}

describe('createBarcodeScannerTracker', () => {
  it('detecta leitura rápida de caracteres como scanner', () => {
    const tracker = createBarcodeScannerTracker(DEFAULT_BARCODE_SCANNER_CONFIG)

    for (let index = 0; index < 6; index += 1) {
      tracker.handleKey(keyEvent('7', index * 10 + 1))
    }

    const result = tracker.handleKey(keyEvent('Enter', 61))

    expect(result).toBe('777777')
  })

  it('ignora digitação lenta de humano', () => {
    const tracker = createBarcodeScannerTracker(DEFAULT_BARCODE_SCANNER_CONFIG)

    tracker.handleKey(keyEvent('1', 0))
    tracker.handleKey(keyEvent('2', 120))
    tracker.handleKey(keyEvent('3', 240))
    tracker.handleKey(keyEvent('4', 360))
    const result = tracker.handleKey(keyEvent('Enter', 480))

    expect(result).toBeNull()
    expect(tracker.getBuffer()).toBe('')
  })

  it('finaliza leitura ao receber Enter', () => {
    const tracker = createBarcodeScannerTracker({ ...DEFAULT_BARCODE_SCANNER_CONFIG, minBarcodeLength: 3 })

    tracker.handleKey(keyEvent('A', 0))
    tracker.handleKey(keyEvent('B', 10))
    tracker.handleKey(keyEvent('C', 20))

    expect(tracker.handleKey(keyEvent('Enter', 30))).toBe('ABC')
  })

  it('limpa o buffer ao exceder timeout do scanner', () => {
    const tracker = createBarcodeScannerTracker({ ...DEFAULT_BARCODE_SCANNER_CONFIG, bufferTimeoutMs: 50 })

    tracker.handleKey(keyEvent('9', 0))
    tracker.handleKey(keyEvent('8', 10))
    tracker.handleKey(keyEvent('7', 20))

    const result = tracker.handleKey(keyEvent('1', 120))

    expect(result).toBeNull()
    expect(tracker.getBuffer()).toBe('')
  })

  it('continua funcionando depois de uma leitura invalida por timeout', () => {
    const tracker = createBarcodeScannerTracker({ ...DEFAULT_BARCODE_SCANNER_CONFIG, bufferTimeoutMs: 50 })

    tracker.handleKey(keyEvent('9', 0))
    tracker.handleKey(keyEvent('8', 10))
    tracker.handleKey(keyEvent('7', 20))
    tracker.handleKey(keyEvent('6', 120))

    tracker.handleKey(keyEvent('A', 200))
    tracker.handleKey(keyEvent('B', 210))
    tracker.handleKey(keyEvent('C', 220))

    expect(tracker.handleKey(keyEvent('Enter', 230))).toBe('ABC')
  })

  it('ignora código abaixo do tamanho mínimo', () => {
    const tracker = createBarcodeScannerTracker({ ...DEFAULT_BARCODE_SCANNER_CONFIG, minBarcodeLength: 6 })

    tracker.handleKey(keyEvent('1', 0))
    tracker.handleKey(keyEvent('2', 5))
    tracker.handleKey(keyEvent('3', 10))
    tracker.handleKey(keyEvent('4', 15))
    tracker.handleKey(keyEvent('5', 20))

    expect(tracker.handleKey(keyEvent('Enter', 25))).toBeNull()
    expect(tracker.getBuffer()).toBe('')
  })

  it('aceita múltiplas leituras consecutivas', () => {
    const tracker = createBarcodeScannerTracker(DEFAULT_BARCODE_SCANNER_CONFIG)

    const first = tracker.handleKey(keyEvent('A', 0))
    tracker.handleKey(keyEvent('B', 10))
    tracker.handleKey(keyEvent('C', 20))
    const firstRead = tracker.handleKey(keyEvent('Enter', 30))

    const second = tracker.handleKey(keyEvent('D', 100))
    tracker.handleKey(keyEvent('E', 110))
    tracker.handleKey(keyEvent('F', 120))
    const secondRead = tracker.handleKey(keyEvent('Enter', 130))

    expect(first).toBeNull()
    expect(firstRead).toBe('ABC')
    expect(second).toBeNull()
    expect(secondRead).toBe('DEF')
  })
})
