'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { seedIfEmpty } from '@/core/database/seed'
import { db } from '@/core/database/db'
import { newAccount } from '@/core/models/account'
import { syncUpsert } from '@/lib/cloud-sync'
import { APP_NAME, BOT_NAME } from '@/lib/constants'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { AccountType } from '@/core/models/enums'

const ACCOUNT_OPTIONS: { name: string; type: AccountType; emoji: string; desc: string }[] = [
  { name: 'Cash',          type: 'cash',        emoji: '💵', desc: 'Physical cash on hand' },
  { name: 'GCash',         type: 'gcash',        emoji: '💙', desc: 'GCash e-wallet' },
  { name: 'Maya',          type: 'maya',         emoji: '💚', desc: 'Maya (PayMaya) e-wallet' },
  { name: 'ShopeePay',     type: 'shopeePay',    emoji: '🧡', desc: 'ShopeePay wallet' },
  { name: 'Bank Savings',  type: 'bankSavings',  emoji: '🏦', desc: 'BDO, BPI, Metrobank, etc.' },
  { name: 'Bank Checking', type: 'bankChecking', emoji: '🏛️', desc: 'Checking / current account' },
  { name: 'Credit Card',   type: 'creditCard',   emoji: '💳', desc: 'Visa, Mastercard, etc.' },
  { name: 'SSS/GSIS',      type: 'custom',       emoji: '🛡️', desc: 'Government contributions' },
  { name: 'Investments',   type: 'custom',       emoji: '📈', desc: 'Stocks, mutual funds, crypto' },
]

export default function OnboardingPage() {
  const [step, setStep]         = useState<1 | 2>(1)
  const [name, setName]         = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(['Cash', 'GCash']))
  const [loading, setLoading]   = useState(false)
  const { setUserName, setOnboardingDone } = useAppStore()
  const router = useRouter()

  const toggleAccount = (accName: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(accName) ? next.delete(accName) : next.add(accName)
      return next
    })
  }

  const handleFinish = async () => {
    if (selected.size === 0) return
    setLoading(true)
    try {
      const finalName = name.trim() || 'Friend'
      setUserName(finalName)
      await seedIfEmpty(finalName)
      // Replace default accounts with user's selection
      await db.accounts.clear()
      const chosen = ACCOUNT_OPTIONS.filter((a) => selected.has(a.name))
      const accounts = chosen.map((a, i) => newAccount({ name: a.name, type: a.type, sortOrder: i }))
      await db.accounts.bulkAdd(accounts)
      syncUpsert('accounts', accounts)
      setOnboardingDone(true)
      router.replace('/dashboard')
    } catch (err) {
      console.error('[onboarding] handleFinish error:', err)
      setLoading(false)
      alert(`Setup failed: ${err instanceof Error ? err.message : String(err)}\n\nCheck the browser console for details.`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-3xl">S</span>
          </div>
          <h1 className="text-3xl font-bold text-white">{APP_NAME}</h1>
          <p className="text-white/70 mt-1 text-sm">Your personal finance coach</p>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${
              s === step ? 'w-8 bg-white' : s < step ? 'w-4 bg-white/60' : 'w-4 bg-white/30'
            }`} />
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-card p-6 shadow-xl">
          {step === 1 && (
            <>
              <h2 className="font-bold text-xl text-[var(--text-primary)] mb-2">Welcome! 👋</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Hi, I&apos;m <strong>{BOT_NAME}</strong> — your AI finance coach. What should I call you?
              </p>
              <Input
                label="Your name"
                placeholder="e.g. Maria, Juan, Ate Joy…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(2)}
                autoFocus
              />
              <Button className="w-full mt-4" size="lg" disabled={!name.trim()} onClick={() => setStep(2)}>
                Continue →
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-bold text-xl text-[var(--text-primary)] mb-1">Your accounts 💳</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Pick the wallets &amp; accounts you use. You can add more later.
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {ACCOUNT_OPTIONS.map((acc) => {
                  const isOn = selected.has(acc.name)
                  return (
                    <button
                      key={acc.name}
                      onClick={() => toggleAccount(acc.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                        isOn ? 'border-brand bg-brand/5' : 'border-[var(--border)]'
                      }`}
                    >
                      <span className="text-xl">{acc.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${isOn ? 'text-brand' : 'text-[var(--text-primary)]'}`}>
                          {acc.name}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] truncate">{acc.desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isOn ? 'border-brand bg-brand' : 'border-slate-300'
                      }`}>
                        {isOn && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="ghost" size="lg" className="flex-1" onClick={() => setStep(1)}>← Back</Button>
                <Button size="lg" className="flex-1" loading={loading} disabled={selected.size === 0} onClick={handleFinish}>
                  Let&apos;s go! 🚀
                </Button>
              </div>
              {selected.size === 0 && (
                <p className="text-xs text-center text-expense mt-2">Select at least one account</p>
              )}
            </>
          )}

          <p className="text-xs text-center text-[var(--text-tertiary)] mt-4">
            All your data stays on your device. Private by default.
          </p>
        </div>
      </div>
    </div>
  )
}
