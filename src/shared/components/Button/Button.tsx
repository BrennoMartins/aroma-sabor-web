import type { ButtonHTMLAttributes, ReactNode } from 'react'

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
  const classes = ['ui-button', `ui-button--${variant}`]

  if (loading) {
    classes.push('ui-button--loading')
  }

  if (className) {
    classes.push(className)
  }

  return (
    <button {...props} className={classes.join(' ')} disabled={disabled || loading}>
      {loading ? <span className="ui-button__spinner" aria-hidden="true" /> : icon ? <span className="ui-button__icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  )
}