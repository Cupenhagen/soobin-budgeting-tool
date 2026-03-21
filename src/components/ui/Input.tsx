import { clsx } from 'clsx'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, className, ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={clsx(
            'input-field',
            leftIcon && 'pl-9',
            error && 'border-expense focus:ring-expense/50',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-expense">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-[var(--text-secondary)]">{hint}</p>}
    </div>
  )
})

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, className, children, ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">{label}</label>}
      <select
        ref={ref}
        className={clsx('input-field appearance-none', error && 'border-expense', className)}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-expense">{error}</p>}
    </div>
  )
})
