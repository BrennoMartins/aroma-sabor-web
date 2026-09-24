import { Clock3, Radio, ShieldEllipsis } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useBarcodeScanner } from '../../../scanner/useBarcodeScanner'
import { Badge } from '../../components/Badge/Badge'

export function Topbar() {
  const { lastBarcode, onScan } = useBarcodeScanner()
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [scannerPulse, setScannerPulse] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onScan(() => {
      setScannerPulse(true)
      window.setTimeout(() => {
        setScannerPulse(false)
      }, 300)
    })

    return () => {
      unsubscribe()
    }
  }, [onScan])

  return (
    <header className="app-topbar">
      <div className="app-topbar__identity">
        <img src="/icons/logo-badge.svg" alt="Logo Madalena Aroma e Sabor" className="app-brandmark app-brandmark--topbar" />
        <div>
          <p className="app-topbar__eyebrow">Operacao em tempo real</p>
          <h1 className="app-topbar__title">Aroma Sabor OS</h1>
        </div>
      </div>

      <div className="app-topbar__meta">
        <div className={scannerPulse ? 'topbar-chip topbar-chip--pulse' : 'topbar-chip'}>
          <Radio size={16} />
          <div>
            <span>Scanner ativo</span>
            <strong>{lastBarcode ?? 'Aguardando leitura'}</strong>
          </div>
        </div>

        <div className="topbar-chip">
          <Clock3 size={16} />
          <div>
            <span>Horario</span>
            <strong>{currentTime.toLocaleTimeString('pt-BR')}</strong>
          </div>
        </div>

        <div className="topbar-training">
          <ShieldEllipsis size={16} />
          <Badge variant="success">Mercado Aberto</Badge>
        </div>
      </div>
    </header>
  )
}