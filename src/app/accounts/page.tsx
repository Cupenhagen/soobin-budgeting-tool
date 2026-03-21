'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Wallet, ChevronRight } from 'lucide-react'
import { db } from '@/core/database/db'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { AmountDisplay } from '@/components/ui/AmountDisplay'
import { AccountModal } from '@/components/accounts/AccountModal'
import { executeBalanceTool } from '@/core/tools/balance-tool'
import { ACCOUNT_TYPE_LABELS } from '@/core/models/enums'

export default function AccountsPage() {
  const [showAdd, setShowAdd] = useState(false)
  const router = useRouter()

  const accounts     = useLiveQuery(() => db.accounts.toArray().then(r => r.filter(a => !a.isArchived).sort((a, b) => a.sortOrder - b.sortOrder)), [])
  const transactions = useLiveQuery(() => db.transactions.limit(500).toArray(), [])

  const balances = accounts && transactions
    ? executeBalanceTool({ accounts, transactions }).balances
    : []

  return (
    <div className="max-w-2xl mx-auto px-m py-m">
      <div className="flex items-center justify-between mb-m">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Accounts</h1>
        <button onClick={() => setShowAdd(true)} className="w-9 h-9 rounded-full bg-brand flex items-center justify-center">
          <Plus size={18} className="text-white" />
        </button>
      </div>

      {balances.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Add your cash, bank accounts, and e-wallets to get started."
          action={{ label: 'Add Account', onClick: () => setShowAdd(true) }}
        />
      ) : (
        <div className="space-y-3">
          {balances.map((b) => (
            <Card key={b.account.id} onClick={() => router.push(`/accounts/${b.account.id}`)}>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">{b.account.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{ACCOUNT_TYPE_LABELS[b.account.type]}</p>
                </div>
                <AmountDisplay amount={b.computedBalance} size="large" />
                <ChevronRight size={16} className="text-[var(--text-tertiary)]" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {showAdd && (
        <AccountModal onClose={() => setShowAdd(false)} />
      )}
    </div>
  )
}
