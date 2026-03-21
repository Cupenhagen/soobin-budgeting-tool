import type { Account } from '../models/account'
import type { Transaction } from '../models/transaction'
import { isLiabilityAccount } from '../models/enums'
import { toNumber } from '@/lib/php-formatter'

export interface AccountBalance {
  account: Account
  computedBalance: number
  lastTransactionDate?: string
}

export interface BalanceResult {
  balances: AccountBalance[]
  totalBalance: number      // sum of non-liability accounts
  totalLiabilities: number  // credit + loans (positive figure)
  netWorth: number          // totalBalance − totalLiabilities
}

export interface BalanceInput {
  accountId?: string        // undefined = all accounts
  transactions: Transaction[]
  accounts: Account[]
}

export function computeBalance(account: Account, transactions: Transaction[]): number {
  const relevant = transactions.filter(
    (tx) => tx.accountId === account.id || tx.destinationAccountId === account.id
  )
  let balance = account.isBalanceManual ? toNumber(account.currentBalance) : 0

  for (const tx of relevant) {
    const amt = toNumber(tx.amount)
    if (tx.type === 'income' && tx.accountId === account.id) {
      balance += amt
    } else if (tx.type === 'expense' && tx.accountId === account.id) {
      balance -= amt
    } else if (tx.type === 'transfer') {
      if (tx.accountId === account.id) balance -= amt
      if (tx.destinationAccountId === account.id) balance += amt
    }
  }
  return balance
}

export function executeBalanceTool(input: BalanceInput): BalanceResult {
  const balances: AccountBalance[] = []

  for (const account of input.accounts.filter((a) => !a.isArchived)) {
    const computed = computeBalance(account, input.transactions)
    const last = input.transactions
      .filter((t) => t.accountId === account.id || t.destinationAccountId === account.id)
      .map((t) => t.date)
      .sort()
      .at(-1)

    balances.push({ account, computedBalance: computed, lastTransactionDate: last })
  }

  const totalBalance = balances
    .filter((b) => !isLiabilityAccount(b.account.type))
    .reduce((s, b) => s + b.computedBalance, 0)

  const totalLiabilities = balances
    .filter((b) => isLiabilityAccount(b.account.type))
    .reduce((s, b) => s + Math.abs(b.computedBalance), 0)

  return { balances, totalBalance, totalLiabilities, netWorth: totalBalance - totalLiabilities }
}
