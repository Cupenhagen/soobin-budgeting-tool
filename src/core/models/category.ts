import type { CategoryTransactionType } from './enums'

export interface Category {
  id: string
  name: string
  iconName: string      // Lucide icon name
  colorHex: string
  type: CategoryTransactionType
  parentCategoryId?: string
  isBuiltIn: boolean
  isHidden: boolean
  sortOrder: number
  createdAt: string
}

export function newCategory(
  partial: Omit<Category, 'id' | 'createdAt' | 'isBuiltIn' | 'isHidden' | 'sortOrder'>
  & Partial<Pick<Category, 'isBuiltIn' | 'isHidden' | 'sortOrder'>>
): Category {
  return {
    id: crypto.randomUUID(),
    isBuiltIn: false,
    isHidden: false,
    sortOrder: 0,
    ...partial,
    createdAt: new Date().toISOString(),
  }
}

// ─── Default Philippine categories ───────────────────────────────────────────

export interface DefaultCategoryDef {
  key: string
  name: string
  icon: string
  color: string
  type: CategoryTransactionType
}

export const DEFAULT_CATEGORIES: DefaultCategoryDef[] = [
  // ── Expenses ──
  { key: 'food',           name: 'Food & Dining',          icon: 'UtensilsCrossed', color: '#FF6B6B', type: 'expense' },
  { key: 'groceries',      name: 'Groceries / Palengke',   icon: 'ShoppingCart',    color: '#4ECDC4', type: 'expense' },
  { key: 'transport',      name: 'Transport',              icon: 'Bus',             color: '#45B7D1', type: 'expense' },
  { key: 'bills',          name: 'Bills & Utilities',      icon: 'Zap',             color: '#FFA07A', type: 'expense' },
  { key: 'rent',           name: 'Rent',                   icon: 'Home',            color: '#98D8C8', type: 'expense' },
  { key: 'healthcare',     name: 'Healthcare',             icon: 'Heart',           color: '#FF69B4', type: 'expense' },
  { key: 'loadAndData',    name: 'Load & Data',            icon: 'Wifi',            color: '#7B68EE', type: 'expense' },
  { key: 'remittance',     name: 'Remittance / Padala',    icon: 'Send',            color: '#20B2AA', type: 'expense' },
  { key: 'sariSari',       name: 'Sari-Sari Store',        icon: 'Store',           color: '#DEB887', type: 'expense' },
  { key: 'leisure',        name: 'Leisure',                icon: 'Gamepad2',        color: '#9370DB', type: 'expense' },
  { key: 'shopping',       name: 'Shopping',               icon: 'ShoppingBag',     color: '#FF8C69', type: 'expense' },
  { key: 'subscriptions',  name: 'Subscriptions',          icon: 'RefreshCw',       color: '#6495ED', type: 'expense' },
  { key: 'debtPayment',    name: 'Debt / Utang Payment',   icon: 'CreditCard',      color: '#CD5C5C', type: 'expense' },
  { key: 'education',      name: 'Education',              icon: 'BookOpen',        color: '#4682B4', type: 'expense' },
  { key: 'churchTithes',   name: 'Church / Tithes',        icon: 'Heart',           color: '#DA70D6', type: 'expense' },
  { key: 'personalCare',   name: 'Personal Care',          icon: 'Sparkles',        color: '#FFB6C1', type: 'expense' },
  { key: 'gifts',          name: 'Gifts & Events',         icon: 'Gift',            color: '#FF7F50', type: 'expense' },
  { key: 'paluwagan',      name: 'Paluwagan',              icon: 'Users',           color: '#8FBC8F', type: 'expense' },
  { key: 'otherExpense',   name: 'Other Expense',          icon: 'MoreHorizontal',  color: '#A9A9A9', type: 'expense' },
  // ── Income ──
  { key: 'salary',             name: 'Salary',                  icon: 'Banknote',    color: '#32CD32', type: 'income' },
  { key: 'overtime',           name: 'Overtime / Night Diff',   icon: 'Moon',        color: '#66CDAA', type: 'income' },
  { key: 'sidelineRaket',      name: 'Sideline / Raket',        icon: 'Briefcase',   color: '#3CB371', type: 'income' },
  { key: 'remittanceReceived', name: 'Remittance Received',     icon: 'Mail',        color: '#00CED1', type: 'income' },
  { key: 'thirteenthMonth',    name: '13th Month / Bonus',      icon: 'Star',        color: '#FFD700', type: 'income' },
  { key: 'sssPhilHealth',      name: 'SSS / PhilHealth',        icon: 'Shield',      color: '#48D1CC', type: 'income' },
  { key: 'otherIncome',        name: 'Other Income',            icon: 'PlusCircle',  color: '#90EE90', type: 'income' },
]
