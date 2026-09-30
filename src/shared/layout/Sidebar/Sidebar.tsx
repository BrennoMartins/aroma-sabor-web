import {
  Archive,
  Cog,
  LayoutGrid,
  Package,
  Receipt,
  ScanLine,
} from 'lucide-react'
import { Logo } from '../../components/Logo/Logo'
import { SidebarItem } from './SidebarItem'
import styles from './Sidebar.module.css'

const navigationItems = [
  { to: '/', label: 'Caixa', icon: ScanLine },
  { to: '/products', label: 'Produtos', icon: Package },
  { to: '/categories', label: 'Categorias', icon: LayoutGrid },
  { to: '/inventory', label: 'Estoque', icon: Archive },
  { to: '/sales', label: 'Vendas', icon: Receipt },
] as const

type SidebarProps = {
  isOpen: boolean
  isDesktop: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, isDesktop, onClose }: SidebarProps) {
  const asideClasses = [styles.sidebar, isOpen ? styles.sidebarOpen : '', isDesktop ? styles.sidebarDesktop : '']
    .filter(Boolean)
    .join(' ')

  return (
    <aside className={asideClasses} aria-label="Barra lateral principal">
      <div className={styles.brand}>
        <Logo src="/icons/logo-badge.svg" alt="Logo oficial Aroma Sabor" size={56} className={styles.logo} />

        <div className={styles.brandText}>
          <strong className={styles.brandTitle}>Aroma Sabor OS</strong>
          <span className={styles.brandSubtitle}>Sistema PDV</span>
        </div>
      </div>

      <nav className={styles.navigation} aria-label="Principal">
        {navigationItems.map(({ to, label, icon }) => (
          <SidebarItem key={to} to={to} label={label} icon={icon} onNavigate={onClose} />
        ))}

        <div className={styles.futureSection} aria-label="Itens futuros">
          <span className={styles.futureLabel}>Futuro</span>
          <SidebarItem to="/settings" label="Configurações" icon={Cog} disabled />
        </div>
      </nav>

      <a href="#main-content" className={styles.skipLink}>
        Ir para o conteudo
      </a>
    </aside>
  )
}