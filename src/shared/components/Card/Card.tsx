import type { PropsWithChildren } from 'react'
import styles from './Card.module.css'

type CardProps = PropsWithChildren<{
  title?: string
  className?: string
}>

export function Card({ title, className, children }: CardProps) {
  const cardClassName = [styles.card, className].filter(Boolean).join(' ')

  return (
    <section className={cardClassName}>
      {title ? <h3 className={styles.title}>{title}</h3> : null}
      <div className={styles.content}>{children}</div>
    </section>
  )
}