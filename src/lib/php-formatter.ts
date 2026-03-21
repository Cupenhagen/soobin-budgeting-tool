import { CURRENCY_SYMBOL } from './constants'

const fullFmt = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const compactFmt = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** Format as "₱1,234.56" */
export function formatPHP(amount: number): string {
  return fullFmt.format(amount)
}

/** Format as "₱1,235" (no decimals, for dashboard cards) */
export function formatPHPCompact(amount: number): string {
  return compactFmt.format(amount)
}

/** Format with sign: "+₱500.00" or "-₱200.00" */
export function formatPHPSigned(amount: number): string {
  const prefix = amount >= 0 ? '+' : ''
  return `${prefix}${formatPHP(amount)}`
}

/** Format large amounts: "₱12.3K", "₱1.5M" */
export function formatPHPAbbreviated(amount: number): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${CURRENCY_SYMBOL}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${sign}${CURRENCY_SYMBOL}${(abs / 1_000).toFixed(1)}K`
  return `${sign}${formatPHP(abs)}`
}

/** Parse "₱1,234.56" or "1234.56" to number */
export function parsePHP(str: string): number {
  const cleaned = str
    .replace(/₱/g, '')
    .replace(/PHP/g, '')
    .replace(/,/g, '')
    .trim()
  return parseFloat(cleaned) || 0
}

/** Convert stored decimal string to number */
export function toNumber(str: string | undefined | null): number {
  if (!str) return 0
  return parseFloat(str) || 0
}
