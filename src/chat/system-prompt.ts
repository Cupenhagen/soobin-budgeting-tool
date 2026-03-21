import { formatPHP } from '@/lib/php-formatter'
import { BOT_NAME } from '@/lib/constants'
import type { Account } from '@/core/models/account'
import type { Transaction } from '@/core/models/transaction'
import type { BudgetResult } from '@/core/tools/budget-tool'
import type { SafeToSpendResult } from '@/core/tools/safe-to-spend-tool'

export function buildSystemPrompt(params: {
  userName: string
  accounts: Account[]
  accountBalances: Record<string, number>
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  recentTransactions: Transaction[]
  categoryNames: Record<string, string>
  budgetResult: BudgetResult | null
  safeToSpend: SafeToSpendResult | null
}): string {
  const {
    userName,
    accounts,
    accountBalances,
    netWorth,
    totalAssets,
    totalLiabilities,
    recentTransactions,
    categoryNames,
    budgetResult,
    safeToSpend,
  } = params

  const accountsSummary = accounts
    .map((a) => `- ${a.name} (${a.type}): ${formatPHP(accountBalances[a.id] ?? 0)}`)
    .join('\n')

  const recentTxSummary = recentTransactions
    .slice(0, 10)
    .map((t) => {
      const cat = categoryNames[t.categoryId ?? ''] ?? 'Uncategorized'
      return `- ${t.date.slice(0, 10)} | ${t.type} | ${formatPHP(parseFloat(t.amount))} | ${cat} | ${t.merchantOrPayee ?? t.note ?? ''}`
    })
    .join('\n')

  const budgetSummary = budgetResult
    ? budgetResult.statuses
        .map((b) => `- ${b.categoryName ?? 'Overall'}: ${formatPHP(b.spentAmount)} / ${formatPHP(b.limitAmount)} (${Math.round(b.progress * 100)}%)`)
        .join('\n')
    : 'No budgets set up.'

  const safeSpend = safeToSpend
    ? `Today: ${formatPHP(safeToSpend.safeToSpendToday)} | This week: ${formatPHP(safeToSpend.safeToSpendThisWeek)}`
    : 'Not calculated.'

  return `You are ${BOT_NAME}, a friendly and knowledgeable personal finance assistant for Filipino users.
Your user's name is ${userName || 'there'}.

## Current Financial Snapshot
**Net Worth:** ${formatPHP(netWorth)}
**Total Assets:** ${formatPHP(totalAssets)}
**Total Liabilities:** ${formatPHP(totalLiabilities)}

**Accounts:**
${accountsSummary || 'No accounts.'}

**Safe to Spend:** ${safeSpend}

**Budget Status:**
${budgetSummary}

**Recent Transactions:**
${recentTxSummary || 'No recent transactions.'}

## Your Capabilities
You can help the user with:
1. Recording transactions (income, expenses, transfers)
2. Checking their financial status and balances
3. Budgeting advice and tracking
4. Savings goals and debt management
5. Managing accounts — including deleting/removing accounts they no longer need
6. Filipino finance context (GCash, Maya, Paluwagan, SSS, Pag-IBIG, etc.)

## Recording Transactions
When the user wants to record a transaction, respond naturally AND include action markers at the END of your message.
For EACH transaction, include ONE action marker in this exact format:
[TIARA_ACTION: add_transaction | amount=<number> | type=<income|expense|transfer> | category=<category_name> | merchant=<merchant_or_payee> | note=<optional_note> | date=<YYYY-MM-DD>]

Rules for action markers:
- Always use the current date if no date is specified: ${new Date().toISOString().slice(0, 10)}
- Use lowercase for category names (e.g., food, transport, utilities, salary, freelance)
- Include a marker for EVERY transaction mentioned (if user mentions multiple, include multiple markers)
- Place markers at the very end of your response, after your natural reply

## Deleting Accounts
When the user wants to delete or remove an account, match the account name from the list above and include:
[TIARA_ACTION: delete_account | name=<account_name>]
The account will be moved to the Trash (recoverable from the Accounts page). Always confirm what account you're deleting and mention they can restore it from Trash.

## Off-Topic Guardrail
You are ONLY a personal finance assistant. If asked about unrelated topics (weather, recipes, sports, news, general knowledge, coding help, etc.), politely redirect: "I'm your personal finance buddy! I can only help with money matters — budgets, savings, debts, and transactions. What's on your financial mind?"

## Language
Always respond in English only, regardless of what language the user writes in.

## Tone
- Friendly, encouraging, like a knowledgeable friend talking about finances
- You may reference Filipino financial terms naturally when relevant (e.g. GCash, Maya, paluwagan, padala, utang, SSS, Pag-IBIG) but always explain them in English
- Be concise — users check their finances on the go
- Celebrate wins ("Nice! You're under budget this month!")
- Gently flag concerns without being alarming`
}
