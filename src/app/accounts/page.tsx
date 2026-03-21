'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Wallet, ChevronRight, Trash2, RotateCcw, X } from 'lucide-react'
import { db } from '@/core/database/db'
import { accountRepo } from '@/core/repositories/account-repo'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { AmountDisplay } from '@/components/ui/AmountDisplay'
import { AccountModal } from '@/components/accounts/AccountModal'
import { executeBalanceTool } from '@/core/tools/balance-tool'
import { ACCOUNT_TYPE_LABELS } from '@/core/models/enums'
import type { Account } from '@/core/models/account'

export default function AccountsPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const router = useRouter()

  const accounts     = useLiveQuery(() => db.accounts.toArray().then(r => r.filter(a => !a.isArchived && !a.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder)), [])
  const transactions = useLiveQuery(() => db.transactions.limit(500).toArray(), [])
  const trashed      = useLiveQuery(() => accountRepo.fetchTrashed(), [])

  const balances = accounts && transactions
    ? executeBalanceTool({ accounts, transactions }).balances
    : []

  const handleRestore = async (account: Account) => {
    await accountRepo.restore(account)
  }

  const handleHardDelete = async (account: Account) => {
    if (confirm(`Permanently delete "${account.name}"? This cannot be undone.`)) {
      await accountRepo.hardDelete(account.id)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-m py-m">
      <div className="flex items-center justify-between mb-m">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Accounts</h1>
        <div className="flex items-center gap-2">
          {(trashed?.length ?? 0) > 0 && (
            <button
              onClick={() => setShowTrash(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border)]"
            >
              <Trash2 size={13} />
              Trash ({trashed!.length})
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="w-9 h-9 rounded-full bg-brand flex items-center justify-center">
            <Plus size={18} className="text-white" />
          </button>
        </div>
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

      {/* Trash modal */}
      {showTrash && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={() => setShowTrash(false)}>
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-card p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trash2 size={16} className="text-expense" />
                <h2 className="font-bold text-[var(--text-primary)]">Trash</h2>
              </div>
              <button onClick={() => setShowTrash(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                <X size={18} />
              </button>
            </div>
            {!trashed?.length ? (
              <p className="text-sm text-[var(--text-secondary)] text-center py-4">Trash is empty</p>
            ) : (
              <div className="space-y-2">
                {trashed.map(account => (
                  <div key={account.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--border)]">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{account.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                    </div>
                    <button
                      onClick={() => handleRestore(account)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-income bg-income/10 hover:bg-income/20"
                    >
                      <RotateCcw size={11} />
                      Restore
                    </button>
                    <button
                      onClick={() => handleHardDelete(account)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-expense bg-expense/10 hover:bg-expense/20"
                    >
                      <X size={11} />
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-[var(--text-tertiary)] text-center mt-4">Deleted accounts can be restored or permanently removed here.</p>
          </div>
        </div>
      )}
    </div>
  )
}
