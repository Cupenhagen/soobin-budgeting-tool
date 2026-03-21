import { clsx } from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-btn active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:   'bg-brand text-white hover:bg-brand-dark',
    secondary: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600',
    ghost:     'text-brand hover:bg-brand/10',
    danger:    'bg-expense text-white hover:bg-red-700',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-m py-xs text-sm',
    lg: 'px-xl py-s text-base',
  }

  return (
    <button
      disabled={disabled || loading}
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
      {children}
    </button>
  )
}
