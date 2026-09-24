import type { PropsWithChildren } from 'react'
import styles from './Badge.module.css'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral'

type BadgeProps = PropsWithChildren<{
  variant?: BadgeVariant
  className?: string
}>

export function Badge({ variant = 'neutral', className, children }: BadgeProps) {
  const variantClass = {
    success: styles.success,
    warning: styles.warning,
    danger: styles.danger,
    neutral: styles.neutral,
  }[variant]

  return <span className={[styles.badge, variantClass, className].filter(Boolean).join(' ')}>{children}</span>
}