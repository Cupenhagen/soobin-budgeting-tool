'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { TransactionModal } from '@/components/transactions/TransactionModal'

export function QuickAddFAB() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 w-14 h-14 rounded-full bg-brand shadow-lg flex items-center justify-center hover:bg-brand-dark active:scale-95 transition-all"
        aria-label="Add transaction"
      >
        <Plus size={26} className="text-white" />
      </button>

      {open && <TransactionModal onClose={() => setOpen(false)} />}
    </>
  )
}
