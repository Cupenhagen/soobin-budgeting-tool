import Link from 'next/link'
import { Card, CardHeader } from '@/components/ui/Card'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { AmountDisplay } from '@/components/ui/AmountDisplay'
import type { Transaction } from '@/core/models/transaction'
import type { Category } from '@/core/models/category'
import { relativeDay } from '@/lib/date-helpers'

interface Props {
  transactions: Transaction[]
  categories: Category[]
}

export function RecentTransactions({ transactions, categories }: Props) {
  if (transactions.length === 0) return null

  return (
    <Card>
      <CardHeader
        title="Recent Transactions"
        action={
          <Link href="/transactions" className="text-xs text-brand font-medium">See all</Link>
        }
      />
      <div className="divide-y divide-[var(--separator)]">
        {transactions.slice(0, 8).map((tx) => {
          const cat = categories.find((c) => c.id === tx.categoryId)
          const variant = tx.type === 'income' ? 'income' : tx.type === 'expense' ? 'expense' : 'transfer'
          const sign = tx.type === 'income' ? 1 : tx.type === 'expense' ? -1 : 0

          return (
            <div key={tx.id} className="flex items-center gap-3 py-3">
              {cat ? (
                <CategoryIcon iconName={cat.iconName} colorHex={cat.colorHex} size={16} />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {tx.merchantOrPayee ?? cat?.name ?? tx.note ?? 'Transaction'}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{relativeDay(tx.date)}</p>
              </div>
              <AmountDisplay
                amount={parseFloat(tx.amount) * (sign === 0 ? 1 : sign)}
                variant={variant}
                size="small"
              />
            </div>
          )
        })}
      </div>
    </Card>
  )
}
