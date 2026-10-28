import { useEffect, useRef, useState } from 'react'

type AudioContextWithWebkit = typeof window & {
  webkitAudioContext?: typeof AudioContext
}

type ScannerAudioFeedbackProps = {
  scanSignal: number
  successSignal: number
  errorSignal: number
}

const SUCCESS_BEEP_DURATION_SECONDS = 0.12
const ERROR_BEEP_DURATION_SECONDS = 0.18
const SUCCESS_BEEP_FREQUENCY_HZ = 1046.5
const ERROR_BEEP_FREQUENCY_HZ = 220

async function playTone(
  audioContextRef: React.MutableRefObject<AudioContext | null>,
  frequency: number,
  duration: number,
): Promise<AudioContext | null> {
  const audioWindow = window as AudioContextWithWebkit
  const AudioContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext

  if (!AudioContextConstructor) {
    return null
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

  return audioContext
}

export function ScannerAudioFeedback({
  scanSignal,
  successSignal,
  errorSignal,
}: ScannerAudioFeedbackProps) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const previousScanSignalRef = useRef(0)
  const previousSuccessSignalRef = useRef(0)
  const previousErrorSignalRef = useRef(0)

  useEffect(() => {
    if (scanSignal === 0 || scanSignal === previousScanSignalRef.current) {
      return
    }

    previousScanSignalRef.current = scanSignal
    void playTone(audioContextRef, SUCCESS_BEEP_FREQUENCY_HZ, SUCCESS_BEEP_DURATION_SECONDS)
      .then(setAudioContext)
  }, [scanSignal])

  useEffect(() => {
    if (successSignal === 0 || successSignal === previousSuccessSignalRef.current) {
      return
    }

    previousSuccessSignalRef.current = successSignal
    void playTone(audioContextRef, SUCCESS_BEEP_FREQUENCY_HZ, SUCCESS_BEEP_DURATION_SECONDS)
      .then(setAudioContext)
  }, [successSignal])

  useEffect(() => {
    if (errorSignal === 0 || errorSignal === previousErrorSignalRef.current) {
      return
    }

    previousErrorSignalRef.current = errorSignal
    void playTone(audioContextRef, ERROR_BEEP_FREQUENCY_HZ, ERROR_BEEP_DURATION_SECONDS)
      .then(setAudioContext)
  }, [errorSignal])

  useEffect(() => {
    if (!audioContext) {
      return
    }

    return () => {
      void audioContext.close()
    }
  }, [audioContext])

  return null
}
