// ─── Transaction ────────────────────────────────────────────────────────────

export type TransactionType = 'expense' | 'income' | 'transfer'

export type TransactionSource =
  | 'manual'
  | 'csvImport'
  | 'pdfImport'
  | 'ocrImport'
  | 'chatbot'
  | 'recurringGenerated'

// ─── Account ────────────────────────────────────────────────────────────────

export type AccountType =
  | 'cash'
  | 'bankSavings'
  | 'bankChecking'
  | 'creditCard'
  | 'gcash'
  | 'maya'
  | 'shopeePay'
  | 'grabPay'
  | 'goTyme'
  | 'tonik'
  | 'unionDigital'
  | 'loan'
  | 'custom'

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Cash',
  bankSavings: 'Bank Savings',
  bankChecking: 'Bank Checking',
  creditCard: 'Credit Card',
  gcash: 'GCash',
  maya: 'Maya',
  shopeePay: 'ShopeePay',
  grabPay: 'GrabPay',
  goTyme: 'GoTyme',
  tonik: 'Tonik',
  unionDigital: 'UnionDigital',
  loan: 'Loan',
  custom: 'Custom',
}

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  cash: 'Banknote',
  bankSavings: 'Building2',
  bankChecking: 'Building2',
  creditCard: 'CreditCard',
  gcash: 'Smartphone',
  maya: 'Smartphone',
  shopeePay: 'Smartphone',
  grabPay: 'Smartphone',
  goTyme: 'Smartphone',
  tonik: 'Smartphone',
  unionDigital: 'Smartphone',
  loan: 'FileText',
  custom: 'Wallet',
}

export function isLiabilityAccount(type: AccountType): boolean {
  return type === 'creditCard' || type === 'loan'
}

export function isEWallet(type: AccountType): boolean {
  return ['gcash', 'maya', 'shopeePay', 'grabPay'].includes(type)
}

export function isDigitalBank(type: AccountType): boolean {
  return ['goTyme', 'tonik', 'unionDigital'].includes(type)
}

export const DEFAULT_ACCOUNTS: Array<{ name: string; type: AccountType }> = [
  { name: 'Cash', type: 'cash' },
  { name: 'GCash', type: 'gcash' },
  { name: 'Maya', type: 'maya' },
  { name: 'Bank Savings', type: 'bankSavings' },
]

// ─── Category ────────────────────────────────────────────────────────────────

export type CategoryTransactionType = 'expense' | 'income' | 'both'

// ─── Budget ──────────────────────────────────────────────────────────────────

export type BudgetPeriod = 'weekly' | 'biweekly' | 'quincena' | 'monthly' | 'custom'

export const BUDGET_PERIOD_LABELS: Record<BudgetPeriod, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  quincena: 'Quincena (15th & End of Month)',
  monthly: 'Monthly',
  custom: 'Custom',
}

// ─── Debt ─────────────────────────────────────────────────────────────────────

export type DebtType =
  | 'creditCard'
  | 'personalLoan'
  | 'sssLoan'
  | 'pagibigLoan'
  | 'salaryLoan'
  | 'informal'
  | 'other'

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  creditCard: 'Credit Card',
  personalLoan: 'Personal Loan',
  sssLoan: 'SSS Loan',
  pagibigLoan: 'Pag-IBIG Loan',
  salaryLoan: 'Salary Loan',
  informal: 'Informal / Utang',
  other: 'Other',
}

// ─── Recurrence ───────────────────────────────────────────────────────────────

export type RecurrenceFrequencyType =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'quincena'
  | 'monthly'
  | 'yearly'
  | 'custom'

export interface RecurrenceFrequency {
  type: RecurrenceFrequencyType
  dayOfWeek?: number   // 0=Sun … 6=Sat
  dayOfMonth?: number  // 1–28
  month?: number       // 1–12 (for yearly)
  day?: number         // day of month (for yearly)
  intervalDays?: number // for custom
}

export function recurrenceLabel(f: RecurrenceFrequency): string {
  switch (f.type) {
    case 'daily':    return 'Daily'
    case 'weekly':   return 'Weekly'
    case 'biweekly': return 'Every 2 Weeks'
    case 'quincena': return 'Quincena (15th & End of Month)'
    case 'monthly':  return 'Monthly'
    case 'yearly':   return 'Yearly'
    case 'custom':   return `Every ${f.intervalDays ?? 1} days`
  }
}

/** Calculate the next occurrence date after a given date */
export function nextRecurrenceDate(f: RecurrenceFrequency, after: Date): Date {
  const d = new Date(after)

  switch (f.type) {
    case 'daily':
      d.setDate(d.getDate() + 1)
      return d

    case 'weekly': {
      const targetDay = f.dayOfWeek ?? 1 // default Monday
      const currentDay = d.getDay()
      let daysToAdd = targetDay - currentDay
      if (daysToAdd <= 0) daysToAdd += 7
      d.setDate(d.getDate() + daysToAdd)
      return d
    }

    case 'biweekly': {
      const targetDay = f.dayOfWeek ?? 1
      const currentDay = d.getDay()
      let daysToAdd = targetDay - currentDay
      if (daysToAdd <= 0) daysToAdd += 7
      d.setDate(d.getDate() + daysToAdd + 7)
      return d
    }

    case 'quincena': {
      const day = d.getDate()
      const year = d.getFullYear()
      const month = d.getMonth()
      if (day < 15) {
        return new Date(year, month, 15)
      } else {
        // last day of current month
        const lastDay = new Date(year, month + 1, 0).getDate()
        if (day < lastDay) {
          return new Date(year, month, lastDay)
        }
        // already at/past last day → go to 15th of next month
        return new Date(year, month + 1, 15)
      }
    }

    case 'monthly': {
      const targetDom = f.dayOfMonth ?? 1
      const currentDom = d.getDate()
      if (currentDom < targetDom) {
        return new Date(d.getFullYear(), d.getMonth(), targetDom)
      }
      return new Date(d.getFullYear(), d.getMonth() + 1, targetDom)
    }

    case 'yearly': {
      const m = (f.month ?? 1) - 1
      const dom = f.day ?? 1
      const candidate = new Date(d.getFullYear(), m, dom)
      if (candidate > d) return candidate
      return new Date(d.getFullYear() + 1, m, dom)
    }

    case 'custom':
      d.setDate(d.getDate() + (f.intervalDays ?? 1))
      return d
  }
}

// ─── Suggestion status ───────────────────────────────────────────────────────

export type SuggestionStatus = 'pending' | 'accepted' | 'skipped' | 'modified'

// ─── Budget status ───────────────────────────────────────────────────────────

export type BudgetStatusLevel = 'onTrack' | 'warning' | 'critical' | 'overBudget'

// ─── Forecast risk ───────────────────────────────────────────────────────────

export type ForecastRisk = 'low' | 'medium' | 'high'
