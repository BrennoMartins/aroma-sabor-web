import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variantClass = {
    primary: styles.primary,
    secondary: styles.secondary,
    success: styles.success,
    danger: styles.danger,
  }[variant]

  const classes = [styles.button, variantClass, loading ? styles.loading : '', className].filter(Boolean).join(' ')

  return (
    <button {...props} className={classes} disabled={disabled || loading} aria-busy={loading}>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : icon ? <span className={styles.icon}>{icon}</span> : null}
      <span>{children}</span>
    </button>
  )
}