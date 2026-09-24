import {
  Archive,
  LayoutGrid,
  Package,
  Receipt,
  ScanLine,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navigationItems = [
  { to: '/', label: 'Caixa', icon: ScanLine, end: true },
  { to: '/products', label: 'Produtos', icon: Package, end: false },
  { to: '/categories', label: 'Categorias', icon: LayoutGrid, end: false },
  { to: '/inventory', label: 'Estoque', icon: Archive, end: false },
  { to: '/sales', label: 'Vendas', icon: Receipt, end: false },
] as const

export function Sidebar() {
  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__brand">
        <img src="/icons/logo-badge.svg" alt="Logo Madalena Aroma e Sabor" className="app-brandmark app-brandmark--sidebar" />
        <span className="app-sidebar__eyebrow">Mercadinho oficial</span>
        <strong className="app-sidebar__title">Aroma Sabor OS</strong>
      </div>

      <nav className="app-sidebar__nav" aria-label="Principal">
        {navigationItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive ? 'app-sidebar__link app-sidebar__link--active' : 'app-sidebar__link'
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}