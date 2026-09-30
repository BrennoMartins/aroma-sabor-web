import { useState, type ImgHTMLAttributes } from 'react'
import styles from './Logo.module.css'

type LogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string
  size?: number
}

export function Logo({ src, size = 48, alt = 'Aroma Sabor OS', className, ...props }: LogoProps) {
  const [hasError, setHasError] = useState(false)
  const showFallback = !src || hasError
  const style = { width: size, height: size }

  if (showFallback) {
    return (
      <div className={[styles.fallback, className].filter(Boolean).join(' ')} style={style} aria-label={alt} role="img">
        <span className={styles.text}>Aroma Sabor OS</span>
      </div>
    )
  }

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={style}
      onError={() => setHasError(true)}
      className={[styles.logo, className].filter(Boolean).join(' ')}
    />
  )
}
