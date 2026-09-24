import type { PropsWithChildren } from 'react'

type CardProps = PropsWithChildren<{
  title?: string
  className?: string
}>

export function Card({ title, className, children }: CardProps) {
  return (
    <section className={className ? `ui-card ${className}` : 'ui-card'}>
      {title ? <h3 className="ui-card__title">{title}</h3> : null}
      <div className="ui-card__content">{children}</div>
    </section>
  )
}