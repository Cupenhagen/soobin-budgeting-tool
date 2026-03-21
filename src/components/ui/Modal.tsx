'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  footer?: React.ReactNode
}

export function Modal({ title, onClose, children, size = 'md', footer }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className={clsx(
        'relative w-full bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-card shadow-xl',
        'max-h-[95vh] overflow-hidden flex flex-col',
        widths[size]
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-m py-s border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text-primary)]">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-[var(--text-secondary)]">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-m">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-m py-s border-t border-[var(--border)] bg-white dark:bg-slate-900">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
