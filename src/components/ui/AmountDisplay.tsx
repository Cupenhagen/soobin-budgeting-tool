import { clsx } from 'clsx'
import { formatPHP, formatPHPCompact, formatPHPAbbreviated } from '@/lib/php-formatter'

interface AmountDisplayProps {
  amount: number
  size?: 'hero' | 'large' | 'normal' | 'small'
  variant?: 'default' | 'income' | 'expense' | 'transfer' | 'auto'
  compact?: boolean
  abbreviated?: boolean
  className?: string
}

export function AmountDisplay({ amount, size = 'normal', variant = 'default', compact, abbreviated, className }: AmountDisplayProps) {
  const formatted = abbreviated
    ? formatPHPAbbreviated(amount)
    : compact
    ? formatPHPCompact(amount)
    : formatPHP(amount)

  const colorClass =
    variant === 'income'   ? 'text-income' :
    variant === 'expense'  ? 'text-expense' :
    variant === 'transfer' ? 'text-transfer' :
    variant === 'auto'     ? (amount >= 0 ? 'text-income' : 'text-expense') :
    'text-[var(--text-primary)]'

  const sizeClass =
    size === 'hero'   ? 'text-hero' :
    size === 'large'  ? 'text-2xl font-bold' :
    size === 'normal' ? 'text-base font-semibold' :
    'text-sm font-medium'

  return (
    <span className={clsx(colorClass, sizeClass, className)}>
      {formatted}
    </span>
  )
}
