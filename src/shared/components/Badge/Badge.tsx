import type { PropsWithChildren } from 'react'

type BadgeVariant = 'primary' | 'success' | 'danger' | 'info'

type BadgeProps = PropsWithChildren<{
  variant?: BadgeVariant
}>

export function Badge({ variant = 'info', children }: BadgeProps) {
  return <span className={`ui-badge ui-badge--${variant}`}>{children}</span>
}