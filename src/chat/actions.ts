import { db } from '@/core/database/db'
import { newTransaction } from '@/core/models/transaction'
import { newBudget } from '@/core/models/budget'
import { newSavingsGoal } from '@/core/models/savings-goal'
import { accountRepo } from '@/core/repositories/account-repo'
import { recurringRepo } from '@/core/repositories/recurring-repo'
import { newRecurring } from '@/core/models/recurring-transaction'
import { syncUpsert } from '@/lib/cloud-sync'
import type { TransactionType, BudgetPeriod, RecurrenceFrequencyType } from '@/core/models/enums'

export type ParsedAction =
  | { type: 'add_transaction'; amount: number; txType: TransactionType; category: string; merchant: string; note: string; date: string }
  | { type: 'update_transaction'; matchMerchant: string; matchDate: string; matchAmount: number; newAmount?: number; newCategory?: string; newMerchant?: string; newNote?: string; newDate?: string }
  | { type: 'delete_account'; name: string }
  | { type: 'add_budget'; categoryName: string; limitAmount: number; period: BudgetPeriod }
  | { type: 'add_savings_goal'; name: string; targetAmount: number; currentAmount: number; targetDate: string }
  | { type: 'add_recurring'; description: string; amount: number; txType: TransactionType; category: string; freqType: RecurrenceFrequencyType; startDate: string; endDate: string }
  | { type: 'cancel_recurring'; name: string }

const ACTION_REGEX = /\[TIARA_ACTION:\s*(add_transaction|update_transaction|delete_account|add_budget|add_savings_goal|add_recurring|cancel_recurring)\s*\|([^\]]+)\]/gi

export function parseActions(text: string): ParsedAction[] {
  const actions: ParsedAction[] = []
  let match: RegExpExecArray | null

  ACTION_REGEX.lastIndex = 0

  while ((match = ACTION_REGEX.exec(text)) !== null) {
    const actionType = match[1].trim()
    const params: Record<string, string> = {}
    match[2].split('|').forEach((part) => {
      const [k, ...v] = part.split('=')
      if (k) params[k.trim()] = v.join('=').trim()
    })

    if (actionType === 'add_transaction') {
      const amount = parseFloat(params.amount ?? '0')
      if (!amount || amount <= 0) continue
      actions.push({
        type: 'add_transaction',
        amount,
        txType: (params.type as TransactionType) ?? 'expense',
        category: params.category ?? '',
        merchant: params.merchant ?? '',
        note: params.note ?? '',
        date: params.date ?? new Date().toISOString().slice(0, 10),
      })
    } else if (actionType === 'update_transaction') {
      actions.push({
        type: 'update_transaction',
        matchMerchant: params.match_merchant ?? '',
        matchDate: params.match_date ?? '',
        matchAmount: parseFloat(params.match_amount ?? '0'),
        newAmount: params.new_amount ? parseFloat(params.new_amount) : undefined,
        newCategory: params.new_category,
        newMerchant: params.new_merchant,
        newNote: params.new_note,
        newDate: params.new_date,
      })
    } else if (actionType === 'delete_account') {
      if (!params.name) continue
      actions.push({ type: 'delete_account', name: params.name })
    } else if (actionType === 'add_budget') {
      const limitAmount = parseFloat(params.limit_amount ?? '0')
      if (!limitAmount || limitAmount <= 0) continue
      actions.push({
        type: 'add_budget',
        categoryName: params.category ?? '',
        limitAmount,
        period: (params.period as BudgetPeriod) ?? 'monthly',
      })
    } else if (actionType === 'add_savings_goal') {
      const targetAmount = parseFloat(params.target_amount ?? '0')
      if (!params.name || !targetAmount) continue
      actions.push({
        type: 'add_savings_goal',
        name: params.name,
        targetAmount,
        currentAmount: parseFloat(params.current_amount ?? '0'),
        targetDate: params.target_date ?? '',
      })
    } else if (actionType === 'add_recurring') {
      const amount = parseFloat(params.amount ?? '0')
      if (!amount || amount <= 0) continue
      actions.push({
        type: 'add_recurring',
        description: params.description ?? '',
        amount,
        txType: (params.tx_type as TransactionType) ?? 'expense',
        category: params.category ?? '',
        freqType: (params.frequency as RecurrenceFrequencyType) ?? 'monthly',
        startDate: params.start_date ?? new Date().toISOString().slice(0, 10),
        endDate: params.end_date ?? '',
      })
    } else if (actionType === 'cancel_recurring') {
      if (!params.name) continue
      actions.push({ type: 'cancel_recurring', name: params.name })
    }
  }

  return actions
}

export function stripActions(text: string): string {
  return text.replace(/\[TIARA_ACTION:[^\]]+\]/gi, '').trim()
}

export async function executeAction(action: ParsedAction): Promise<void> {
  if (action.type === 'delete_account') {
    const account = await accountRepo.findByName(action.name)
    if (!account) throw new Error(`Account "${action.name}" not found.`)
    await accountRepo.softDelete(account)
    return
  }

  if (action.type === 'update_transaction') {
    // Find best matching recent transaction
    const recent = await db.transactions.orderBy('date').reverse().limit(50).toArray()
    const tx = recent.find((t) => {
      const merchantMatch = action.matchMerchant
        ? (t.merchantOrPayee ?? '').toLowerCase().includes(action.matchMerchant.toLowerCase())
        : true
      const dateMatch = action.matchDate ? t.date.slice(0, 10) === action.matchDate : true
      const amountMatch = action.matchAmount > 0 ? Math.abs(parseFloat(t.amount) - action.matchAmount) < 1 : true
      return merchantMatch && dateMatch && amountMatch
    }) ?? recent[0] // fall back to most recent if no specific match

    if (!tx) throw new Error('No matching transaction found to update.')

    const categories = await db.categories.toArray()
    let categoryId = tx.categoryId
    if (action.newCategory) {
      const cat = categories.find(
        (c) => c.name.toLowerCase().includes(action.newCategory!.toLowerCase()) ||
               action.newCategory!.toLowerCase().includes(c.name.toLowerCase())
      )
      if (cat) categoryId = cat.id
    }

    const updated = {
      ...tx,
      amount: action.newAmount != null ? action.newAmount.toFixed(2) : tx.amount,
      merchantOrPayee: action.newMerchant !== undefined ? (action.newMerchant || undefined) : tx.merchantOrPayee,
      note: action.newNote !== undefined ? (action.newNote || undefined) : tx.note,
      date: action.newDate ?? tx.date,
      categoryId,
      updatedAt: new Date().toISOString(),
    }
    await db.transactions.put(updated)
    syncUpsert('transactions', updated)
    return
  }

  if (action.type === 'cancel_recurring') {
    const all = await recurringRepo.fetchAll()
    const rt = all.find((r) =>
      (r.template.merchantOrPayee ?? '').toLowerCase().includes(action.name.toLowerCase()) ||
      action.name.toLowerCase().includes((r.template.merchantOrPayee ?? '').toLowerCase())
    )
    if (!rt) throw new Error(`No recurring transaction found matching "${action.name}".`)
    await recurringRepo.update({ ...rt, isActive: false, updatedAt: new Date().toISOString() })
    return
  }

  if (action.type === 'add_recurring') {
    const categories = await db.categories.toArray()
    const cat = action.category
      ? categories.find(
          (c) => c.name.toLowerCase().includes(action.category.toLowerCase()) ||
                 action.category.toLowerCase().includes(c.name.toLowerCase())
        )
      : undefined
    const allAccounts = await db.accounts.toArray()
    const account = allAccounts.find((a) => !a.isArchived && !a.deletedAt) ?? allAccounts[0]
    if (!account) throw new Error('No accounts found. Please add an account first.')

    const startDt = new Date(action.startDate)
    const freq = { type: action.freqType }
    const { nextRecurrenceDate } = await import('@/core/models/enums')
    const nextDue = startDt <= new Date()
      ? nextRecurrenceDate(freq, startDt).toISOString()
      : startDt.toISOString()

    const rt = newRecurring({
      template: {
        type: action.txType,
        amount: action.amount.toFixed(2),
        currencyCode: 'PHP',
        accountId: account.id,
        categoryId: cat?.id,
        merchantOrPayee: action.description || undefined,
        tags: [],
      },
      frequency: freq,
      startDate: action.startDate,
      endDate: action.endDate || undefined,
      nextDueDate: nextDue,
      autoPost: false,
    })
    await recurringRepo.insert(rt)
    return
  }

  if (action.type === 'add_budget') {
    const categories = await db.categories.toArray()
    const cat = action.categoryName
      ? categories.find(
          (c) => c.name.toLowerCase().includes(action.categoryName.toLowerCase()) ||
                 action.categoryName.toLowerCase().includes(c.name.toLowerCase())
        )
      : undefined
    const today = new Date()
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
    const budget = newBudget({
      categoryId: cat?.id,
      amount: action.limitAmount.toFixed(2),
      period: action.period,
      startDate,
    })
    await db.budgets.add(budget)
    syncUpsert('budgets', budget)
    return
  }

  if (action.type === 'add_savings_goal') {
    const goal = newSavingsGoal({
      name: action.name,
      targetAmount: action.targetAmount.toFixed(2),
      currentAmount: action.currentAmount > 0 ? action.currentAmount.toFixed(2) : '0',
      targetDate: action.targetDate || undefined,
    })
    await db.savingsGoals.add(goal)
    syncUpsert('savings_goals', goal)
    return
  }

  // add_transaction
  const categories = await db.categories.toArray()
  const cat = categories.find(
    (c) => c.name.toLowerCase().includes(action.category.toLowerCase()) ||
           action.category.toLowerCase().includes(c.name.toLowerCase())
  )

  const allAccounts = await db.accounts.toArray()
  const account = allAccounts.find((a) => !a.isArchived && !a.deletedAt) ?? allAccounts[0]
  if (!account) throw new Error('No accounts found. Please add an account first in the Accounts tab.')

  const tx = newTransaction({
    type: action.txType,
    amount: action.amount.toFixed(2),
    accountId: account.id,
    categoryId: cat?.id,
    merchantOrPayee: action.merchant || undefined,
    note: action.note || undefined,
    date: action.date,
  })

  await db.transactions.add(tx)
  syncUpsert('transactions', tx)
}
