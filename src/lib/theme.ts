// Design tokens ported from TiaraTheme.swift
export const theme = {
  colors: {
    brand:     '#7C3AED',
    brandLight:'#A78BFA',
    brandDark: '#5B21B6',
    income:    '#059669',
    expense:   '#DC2626',
    transfer:  '#2563EB',
    warning:   '#D97706',
    danger:    '#DC2626',
    success:   '#059669',
    chart: ['#7C3AED','#059669','#2563EB','#D97706','#DB2777','#0891B2'],
  },
  radius: {
    card:   16,
    chip:   10,
    button: 12,
    small:  8,
  },
  shadow: {
    card:   '0 4px 12px rgba(0,0,0,0.07)',
    subtle: '0 2px 6px rgba(0,0,0,0.04)',
  },
  spacing: { xxs:4, xs:8, s:12, m:16, l:20, xl:24, xxl:32 },
} as const

/** Returns Tailwind colour class for a transaction type */
export function txColor(type: 'expense' | 'income' | 'transfer'): string {
  return type === 'income' ? 'text-income' : type === 'expense' ? 'text-expense' : 'text-transfer'
}

/** Returns Tailwind bg class for budget status */
export function budgetStatusColor(level: 'onTrack' | 'warning' | 'critical' | 'overBudget'): string {
  switch (level) {
    case 'onTrack':   return 'bg-income'
    case 'warning':   return 'bg-warning'
    case 'critical':  return 'bg-expense'
    case 'overBudget':return 'bg-expense'
  }
}
