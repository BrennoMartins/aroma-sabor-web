import { forwardRef, type InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, ...props },
  ref,
) {
  const inputId = id ?? props.name

  return (
    <label className="ui-input-group" htmlFor={inputId}>
      {label ? <span className="ui-input-group__label">{label}</span> : null}
      <input ref={ref} {...props} id={inputId} className={className ? `ui-input ${className}` : 'ui-input'} />
      {error ? <span className="ui-input-group__error">{error}</span> : null}
    </label>
  )
})