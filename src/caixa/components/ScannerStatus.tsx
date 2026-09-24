import { useEffect, useRef, useState } from 'react'
import { useBarcodeScanner } from '../../scanner/useBarcodeScanner'

type AudioContextWithWebkit = typeof window & {
  webkitAudioContext?: typeof AudioContext
}

type ScannerStatusProps = {
  lastBarcode: string | null
  successSignal: number
  errorSignal: number
}

const FEEDBACK_DURATION_MS = 300
const SUCCESS_BEEP_DURATION_SECONDS = 0.12
const ERROR_BEEP_DURATION_SECONDS = 0.18
const SUCCESS_BEEP_FREQUENCY_HZ = 1046.5
const ERROR_BEEP_FREQUENCY_HZ = 220

async function playTone(
  audioContextRef: React.MutableRefObject<AudioContext | null>,
  frequency: number,
  duration: number,
) {
  const audioWindow = window as AudioContextWithWebkit
  const AudioContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext

  if (!AudioContextConstructor) {
    return
  }

  if (!audioContextRef.current) {
    audioContextRef.current = new AudioContextConstructor()
  }

  const audioContext = audioContextRef.current

  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
  gainNode.gain.setValueAtTime(0.001, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.15, audioContext.currentTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + duration)
}

export function ScannerStatus({ lastBarcode, successSignal, errorSignal }: ScannerStatusProps) {
  const { onScan } = useBarcodeScanner()
  const [flashVariant, setFlashVariant] = useState<'idle' | 'success' | 'error'>('idle')
  const feedbackTimeoutRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const previousSuccessSignalRef = useRef(0)
  const previousErrorSignalRef = useRef(0)

  const triggerSuccessFeedback = () => {
    setFlashVariant('success')

    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current)
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFlashVariant('idle')
    }, FEEDBACK_DURATION_MS)

    void playTone(audioContextRef, SUCCESS_BEEP_FREQUENCY_HZ, SUCCESS_BEEP_DURATION_SECONDS)
  }

  useEffect(() => {
    const unsubscribe = onScan(() => {
      triggerSuccessFeedback()
    })

    return () => {
      unsubscribe()
    }
  }, [onScan])

  useEffect(() => {
    if (successSignal === 0 || successSignal === previousSuccessSignalRef.current) {
      return
    }

    previousSuccessSignalRef.current = successSignal
    triggerSuccessFeedback()
  }, [successSignal])

  useEffect(() => {
    if (errorSignal === 0 || errorSignal === previousErrorSignalRef.current) {
      return
    }

    previousErrorSignalRef.current = errorSignal
    setFlashVariant('error')

    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current)
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFlashVariant('idle')
    }, FEEDBACK_DURATION_MS)

    void playTone(audioContextRef, ERROR_BEEP_FREQUENCY_HZ, ERROR_BEEP_DURATION_SECONDS)
  }, [errorSignal])

  useEffect(() => {
    const audioContext = audioContextRef.current

    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current)
      }

      if (audioContext) {
        void audioContext.close()
      }
    }
  }, [])

  return (
    <section
      className={
        flashVariant === 'success'
          ? 'scanner-status scanner-status--success'
          : flashVariant === 'error'
            ? 'scanner-status scanner-status--error'
            : 'scanner-status'
      }
      aria-live="polite"
    >
      <div className="scanner-status__row">
        <span className="scanner-status__dot" />
        <strong>Scanner conectado</strong>
      </div>

      <div className="scanner-result scanner-result--compact">
        <span className="scanner-result__label">Ultimo codigo lido</span>
        <strong className="scanner-result__value">{lastBarcode ?? 'Nenhuma leitura ainda.'}</strong>
      </div>
    </section>
  )
}