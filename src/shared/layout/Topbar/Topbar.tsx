import { Clock3, Menu, Radio } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '../../components/Badge/Badge'
import { Button } from '../../components/Button/Button'
import { CloseMarketModal } from '../../../turn/components/CloseMarketModal'
import { MarketStatus } from '../../../turn/components/MarketStatus'
import { OpenMarketModal } from '../../../turn/components/OpenMarketModal'
import { formatMarketElapsedTime, useMarketSession } from '../../../turn/hooks/useMarketSession'
import styles from './Topbar.module.css'

type TopbarProps = {
  isSidebarOpen: boolean
  onSidebarToggle: () => void
}

export function Topbar({ isSidebarOpen, onSidebarToggle }: TopbarProps) {
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [isOpenMarketModalVisible, setIsOpenMarketModalVisible] = useState(false)
  const [isCloseMarketModalVisible, setIsCloseMarketModalVisible] = useState(false)

  const { isOpen, elapsedTime, openMarket, closeMarket } = useMarketSession()

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  const handleOpenMarket = () => {
    openMarket()
    setIsOpenMarketModalVisible(false)
  }

  const handleCloseMarket = () => {
    closeMarket()
    setIsCloseMarketModalVisible(false)
  }

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.leading}>
          <Button
            type="button"
            variant="secondary"
            icon={<Menu size={18} aria-hidden="true" />}
            className={styles.menuButton}
            aria-label={isSidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
            aria-expanded={isSidebarOpen}
            onClick={onSidebarToggle}
          >
            Menu
          </Button>

          <div className={styles.identity}>
            <span className={styles.eyebrow}>Sistema operacional do mercadinho</span>
            <strong className={styles.title}>Aroma Sabor OS</strong>
          </div>
        </div>

        <div className={styles.statusGroup}>
          <div className={styles.statusCard} aria-label="Relogio do sistema">
            <Clock3 size={16} aria-hidden="true" />
            <div>
              <span className={styles.statusLabel}>Horario</span>
              <strong>{currentTime.toLocaleTimeString('pt-BR')}</strong>
            </div>
          </div>

          <div className={styles.statusCard} aria-label="Status do scanner">
            <Radio size={16} aria-hidden="true" className={styles.statusSuccessIcon} />
            <div>
              <span className={styles.statusLabel}>Scanner</span>
              <Badge variant="success">Scanner Conectado</Badge>
            </div>
          </div>

          <div className={styles.marketCard} aria-label="Status do mercado">
            <MarketStatus isOpen={isOpen} elapsedTime={formatMarketElapsedTime(elapsedTime)} />
            <Button
              type="button"
              variant={isOpen ? 'danger' : 'success'}
              onClick={() => (isOpen ? setIsCloseMarketModalVisible(true) : setIsOpenMarketModalVisible(true))}
            >
              {isOpen ? 'Fechar Mercado' : 'Abrir Mercado'}
            </Button>
          </div>
        </div>
      </header>

      <OpenMarketModal
        open={isOpenMarketModalVisible}
        onClose={() => setIsOpenMarketModalVisible(false)}
        onConfirm={handleOpenMarket}
      />

      <CloseMarketModal
        open={isCloseMarketModalVisible}
        duration={formatMarketElapsedTime(elapsedTime)}
        onClose={() => setIsCloseMarketModalVisible(false)}
        onConfirm={handleCloseMarket}
      />
    </>
  )
}