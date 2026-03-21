'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Send, Loader2, CheckCircle, XCircle, Sparkles } from 'lucide-react'
import { db } from '@/core/database/db'
import { useAppStore } from '@/store/app-store'
import { buildSystemPrompt } from '@/chat/system-prompt'
import { streamChat, type ChatMessage } from '@/chat/engine'
import { parseActions, stripActions, executeAction, type ParsedAction } from '@/chat/actions'
import { executeBalanceTool } from '@/core/tools/balance-tool'
import { executeBudgetTool } from '@/core/tools/budget-tool'
import { executeSafeToSpendTool } from '@/core/tools/safe-to-spend-tool'
import { formatPHP } from '@/lib/php-formatter'
import { BOT_NAME } from '@/lib/constants'
import { clsx } from 'clsx'

interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions?: ParsedAction[]
  actionsConfirmed?: boolean
}

export default function ChatPage() {
  const { userName, apiProvider, apiKey, apiModel, apiEndpoint } = useAppStore()
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const accounts     = useLiveQuery(() => db.accounts.toArray().then(r => r.filter(a => !a.isArchived)), [])
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().limit(30).toArray(), [])
  const categories   = useLiveQuery(() => db.categories.toArray(), [])
  const budgets      = useLiveQuery(() => db.budgets.toArray().then(r => r.filter(b => b.isActive)), [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const buildContext = useCallback(() => {
    const accs = accounts ?? []
    const txs = transactions ?? []
    const cats = categories ?? []
    const buds = budgets ?? []

    const balResult = executeBalanceTool({ accounts: accs, transactions: txs })
    const budResult = buds.length ? executeBudgetTool({ budgets: buds, categories: cats, transactions: txs, referenceDate: new Date() }) : null
    const safeResult = budResult ? executeSafeToSpendTool({ totalBalance: balResult.totalBalance, budgetResult: budResult, upcomingBillsTotal: 0, savingsGoalTarget: 0, referenceDate: new Date() }) : null

    const catNames: Record<string, string> = {}
    cats.forEach((c) => { catNames[c.id] = c.name })

    const balMap: Record<string, number> = {}
    balResult.balances.forEach((b) => { balMap[b.account.id] = b.computedBalance })

    return buildSystemPrompt({
      userName,
      accounts: accs,
      accountBalances: balMap,
      netWorth: balResult.netWorth,
      totalAssets: balResult.totalBalance,
      totalLiabilities: balResult.totalLiabilities,
      recentTransactions: txs,
      categoryNames: catNames,
      budgetResult: budResult,
      safeToSpend: safeResult,
    })
  }, [accounts, transactions, categories, budgets, userName])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: UIMessage = { id: crypto.randomUUID(), role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const systemPrompt = buildContext()
      const chatHistory: ChatMessage[] = newMessages.map((m) => ({ role: m.role, content: m.content }))

      let fullText = ''
      for await (const chunk of streamChat(chatHistory, systemPrompt, apiProvider, apiKey, apiModel, apiEndpoint)) {
        fullText += chunk
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: fullText } : m)
        )
      }

      const actions = parseActions(fullText)
      const displayText = stripActions(fullText)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: displayText, actions: actions.length > 0 ? actions : undefined }
            : m
        )
      )
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong.'
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${errMsg}` } : m)
      )
    } finally {
      setLoading(false)
    }
  }

  const confirmActions = async (msgId: string, actions: ParsedAction[]) => {
    for (const action of actions) {
      await executeAction(action)
    }
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, actionsConfirmed: true } : m)
    )
  }

  const dismissActions = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, actions: undefined } : m)
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-m py-3 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm text-[var(--text-primary)]">{BOT_NAME} AI</p>
          <p className="text-xs text-[var(--text-secondary)]">Your personal finance buddy</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-m py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles size={28} className="text-brand" />
            </div>
            <p className="font-semibold text-[var(--text-primary)] mb-1">Hi{userName ? `, ${userName}` : ''}!</p>
            <p className="text-sm text-[var(--text-secondary)] max-w-xs mx-auto">
              Ask me about your finances, record transactions, or get budgeting advice.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {[
                'How much can I spend today?',
                'I spent ₱200 on lunch',
                'How are my budgets?',
                'I got paid ₱15,000 today',
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); textareaRef.current?.focus() }}
                  className="text-xs bg-[var(--surface-secondary)] text-[var(--text-secondary)] rounded-full px-3 py-1.5 hover:bg-brand/10 hover:text-brand transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={clsx('max-w-[80%] space-y-2')}>
              <div
                className={clsx(
                  'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-brand text-white rounded-br-sm'
                    : 'bg-[var(--surface-secondary)] text-[var(--text-primary)] rounded-bl-sm'
                )}
              >
                {msg.content || (loading && msg.role === 'assistant' ? (
                  <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Loader2 size={14} className="animate-spin" /> Thinking…
                  </span>
                ) : '')}
              </div>

              {/* Action confirmation card */}
              {msg.actions && !msg.actionsConfirmed && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">Confirm action{msg.actions.length > 1 ? 's' : ''}:</p>
                  {msg.actions.map((a, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        {a.type === 'delete_account' ? (
                          <span className="text-xs font-semibold text-expense">Delete account: {a.name}</span>
                        ) : (
                          <>
                            <span className={clsx(
                              'text-xs font-semibold',
                              a.txType === 'income' ? 'text-income' : 'text-expense'
                            )}>
                              {a.txType === 'income' ? '+' : '-'}{formatPHP(a.amount)}
                            </span>
                            <span className="text-xs text-[var(--text-secondary)] ml-2">
                              {a.merchant || a.category || a.note}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => confirmActions(msg.id, msg.actions!)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-income/10 text-income rounded-lg py-2 hover:bg-income/20 transition-colors"
                    >
                      <CheckCircle size={14} /> Confirm
                    </button>
                    <button
                      onClick={() => dismissActions(msg.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-[var(--surface-secondary)] text-[var(--text-secondary)] rounded-lg py-2 hover:bg-expense/10 hover:text-expense transition-colors"
                    >
                      <XCircle size={14} /> Dismiss
                    </button>
                  </div>
                </div>
              )}

              {msg.actionsConfirmed && (
                <p className="text-xs text-income flex items-center gap-1 px-1">
                  <CheckCircle size={12} /> Transaction{(msg.actions?.length ?? 1) > 1 ? 's' : ''} recorded!
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-[var(--border)] px-m py-3">
        {!apiKey && (
          <p className="text-xs text-warning text-center mb-2">
            No API key set — <a href="/settings" className="underline">configure in Settings</a>
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your finances…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand/50 max-h-32"
            style={{ overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-full bg-brand flex items-center justify-center text-white disabled:opacity-40 transition-opacity shrink-0"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] text-center mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
