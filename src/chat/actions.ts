import { db } from '@/core/database/db'
import { newTransaction } from '@/core/models/transaction'
import { accountRepo } from '@/core/repositories/account-repo'
import type { TransactionType } from '@/core/models/enums'

export type ParsedAction =
  | { type: 'add_transaction'; amount: number; txType: TransactionType; category: string; merchant: string; note: string; date: string }
  | { type: 'delete_account'; name: string }

const ACTION_REGEX = /\[TIARA_ACTION:\s*(add_transaction|delete_account)\s*\|([^\]]+)\]/gi

export function parseActions(text: string): ParsedAction[] {
  const actions: ParsedAction[] = []
  let match: RegExpExecArray | null

  // Reset lastIndex for global regex
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
    } else if (actionType === 'delete_account') {
      if (!params.name) continue
      actions.push({ type: 'delete_account', name: params.name })
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
}
