import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'

type SidebarItemProps = {
  icon: LucideIcon
  label: string
  to: string
  active?: boolean
  onNavigate?: () => void
}

export function SidebarItem({ icon: Icon, label, to, active, onNavigate }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      aria-label={`Ir para ${label}`}
      className={({ isActive }) => {
        const isCurrentRoute = active ?? isActive

        return [styles.item, isCurrentRoute ? styles.itemActive : ''].filter(Boolean).join(' ')
      }}
      onClick={onNavigate}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  )
}