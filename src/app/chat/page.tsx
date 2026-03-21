'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Send, Loader2, CheckCircle, XCircle, Sparkles, Paperclip, X, Trash2 } from 'lucide-react'
import { db } from '@/core/database/db'
import { useAppStore } from '@/store/app-store'
import { buildSystemPrompt } from '@/chat/system-prompt'
import { streamChat, type ChatMessage, type ContentBlock } from '@/chat/engine'
import { parseActions, stripActions, executeAction, type ParsedAction } from '@/chat/actions'
import { executeBalanceTool } from '@/core/tools/balance-tool'
import { executeBudgetTool } from '@/core/tools/budget-tool'
import { executeSafeToSpendTool } from '@/core/tools/safe-to-spend-tool'
import { formatPHP } from '@/lib/php-formatter'
import { BOT_NAME } from '@/lib/constants'
import { clsx } from 'clsx'
import * as XLSX from 'xlsx'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

interface AttachedFile {
  name: string
  type: 'image' | 'pdf' | 'spreadsheet' | 'text'
  /** base64 for image/pdf, plain text for spreadsheet/csv */
  content: string
  mediaType?: string
}

interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachedFile?: AttachedFile
  actions?: ParsedAction[]
  actionsConfirmed?: boolean
}

function uiToEngineMessage(msg: UIMessage): ChatMessage {
  if (!msg.attachedFile) return { role: msg.role, content: msg.content }

  const file = msg.attachedFile
  const blocks: ContentBlock[] = []

  if (file.type === 'image') {
    blocks.push({ type: 'image', mediaType: file.mediaType ?? 'image/jpeg', data: file.content })
  } else if (file.type === 'pdf') {
    blocks.push({ type: 'document', mediaType: 'application/pdf', data: file.content })
  } else {
    // spreadsheet/text: inject as text context
    blocks.push({ type: 'text', text: `[File: ${file.name}]\n\`\`\`\n${file.content.slice(0, 8000)}\n\`\`\`` })
  }

  if (msg.content) blocks.push({ type: 'text', text: msg.content })
  return { role: msg.role, content: blocks }
}

export default function ChatPage() {
  const { userName, apiProvider, apiKey, apiModel, apiEndpoint } = useAppStore()
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const accounts     = useLiveQuery(() => db.accounts.toArray().then(r => r.filter(a => !a.isArchived && !a.deletedAt)), [])
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().limit(30).toArray(), [])
  const categories   = useLiveQuery(() => db.categories.toArray(), [])
  const budgets      = useLiveQuery(() => db.budgets.toArray().then(r => r.filter(b => b.isActive)), [])

  // Load chat history from DB on mount (last 30 days)
  useEffect(() => {
    const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString()
    db.chatMessages
      .where('timestamp').above(cutoff)
      .sortBy('timestamp')
      .then((rows) => {
        const loaded: UIMessage[] = rows.map((r) => ({
          id: r.id,
          role: r.role,
          content: r.content,
          attachedFile: r.attachedFileName
            ? { name: r.attachedFileName, type: 'image', content: r.attachedImageData ?? '', mediaType: 'image/jpeg' }
            : undefined,
          actionsConfirmed: true, // past actions already executed
        }))
        setMessages(loaded)
        setHistoryLoaded(true)
      })
  }, [])

  // Prune messages older than 30 days
  useEffect(() => {
    const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString()
    db.chatMessages.where('timestamp').below(cutoff).delete()
  }, [])

  useEffect(() => {
    if (historyLoaded) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [historyLoaded])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const saveMessage = async (msg: UIMessage) => {
    await db.chatMessages.put({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date().toISOString(),
      attachedImageData: msg.attachedFile?.type === 'image' ? msg.attachedFile.content : undefined,
      attachedFileName: msg.attachedFile?.name,
    })
  }

  const clearHistory = async () => {
    if (!confirm('Clear all chat history? This cannot be undone.')) return
    await db.chatMessages.clear()
    setMessages([])
  }

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

  const processFile = (file: File): Promise<AttachedFile> => {
    return new Promise((resolve, reject) => {
      const name = file.name
      const mime = file.type

      // Images
      if (mime.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          const base64 = dataUrl.split(',')[1]
          resolve({ name, type: 'image', content: base64, mediaType: mime })
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
        return
      }

      // PDF
      if (mime === 'application/pdf') {
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          const base64 = dataUrl.split(',')[1]
          resolve({ name, type: 'pdf', content: base64, mediaType: 'application/pdf' })
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
        return
      }

      // CSV / plain text
      if (mime === 'text/csv' || mime === 'text/plain' || name.endsWith('.csv') || name.endsWith('.txt')) {
        const reader = new FileReader()
        reader.onload = () => resolve({ name, type: 'text', content: reader.result as string })
        reader.onerror = reject
        reader.readAsText(file)
        return
      }

      // Excel (.xlsx / .xls)
      if (name.endsWith('.xlsx') || name.endsWith('.xls') || mime.includes('spreadsheet') || mime.includes('excel')) {
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const workbook = XLSX.read(reader.result, { type: 'array' })
            const csvParts: string[] = []
            workbook.SheetNames.forEach((sheetName) => {
              const sheet = workbook.Sheets[sheetName]
              const csv = XLSX.utils.sheet_to_csv(sheet)
              if (csv.trim()) csvParts.push(`# Sheet: ${sheetName}\n${csv}`)
            })
            resolve({ name, type: 'spreadsheet', content: csvParts.join('\n\n') })
          } catch (e) {
            reject(e)
          }
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
        return
      }

      reject(new Error(`Unsupported file type: ${mime || name}`))
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const processed = await processFile(file)
      setAttachedFile(processed)
    } catch (err) {
      alert(`Could not read file: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if ((!text && !attachedFile) || loading) return

    const userMsg: UIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      attachedFile: attachedFile ?? undefined,
    }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setAttachedFile(null)
    setLoading(true)
    await saveMessage(userMsg)

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const systemPrompt = buildContext()
      const chatHistory: ChatMessage[] = newMessages.map(uiToEngineMessage)

      let fullText = ''
      for await (const chunk of streamChat(chatHistory, systemPrompt, apiProvider, apiKey, apiModel, apiEndpoint)) {
        fullText += chunk
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: fullText } : m)
        )
      }

      const actions = parseActions(fullText)
      const displayText = stripActions(fullText)
      const assistantMsg: UIMessage = {
        id: assistantId,
        role: 'assistant',
        content: displayText,
        actions: actions.length > 0 ? actions : undefined,
      }
      setMessages((prev) => prev.map((m) => m.id === assistantId ? assistantMsg : m))
      await saveMessage(assistantMsg)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong.'
      const errUiMsg: UIMessage = { id: assistantId, role: 'assistant', content: `Error: ${errMsg}` }
      setMessages((prev) => prev.map((m) => m.id === assistantId ? errUiMsg : m))
      await saveMessage(errUiMsg)
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
    // Update DB record to mark confirmed
    await db.chatMessages.where('id').equals(msgId).modify((r) => { r.content = r.content })
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
        <div className="flex-1">
          <p className="font-semibold text-sm text-[var(--text-primary)]">{BOT_NAME} AI</p>
          <p className="text-xs text-[var(--text-secondary)]">Your personal finance buddy</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            title="Clear chat history"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[var(--text-tertiary)] hover:text-expense hover:bg-expense/10 transition-colors"
          >
            <Trash2 size={13} /> Clear
          </button>
        )}
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
              Ask me about your finances, record transactions, or upload a bank statement.
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
              {/* File attachment preview */}
              {msg.attachedFile && (
                <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-xl text-xs', msg.role === 'user' ? 'bg-brand/80 text-white/90' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]')}>
                  <Paperclip size={11} />
                  <span className="truncate max-w-[180px]">{msg.attachedFile.name}</span>
                  {msg.attachedFile.type === 'image' && (
                    <img
                      src={`data:${msg.attachedFile.mediaType};base64,${msg.attachedFile.content}`}
                      alt="attached"
                      className="w-12 h-12 rounded object-cover ml-1"
                    />
                  )}
                </div>
              )}

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
                        ) : a.type === 'update_transaction' ? (
                          <span className="text-xs font-semibold text-transfer">
                            Update transaction
                            {a.matchMerchant ? ` · ${a.matchMerchant}` : ''}
                            {a.newAmount != null ? ` → ${formatPHP(a.newAmount)}` : ''}
                          </span>
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

              {msg.actionsConfirmed && msg.actions && (
                <p className="text-xs text-income flex items-center gap-1 px-1">
                  <CheckCircle size={12} /> Done!
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

        {/* Attached file chip */}
        {attachedFile && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-brand/10 rounded-lg w-fit max-w-full">
            <Paperclip size={12} className="text-brand shrink-0" />
            <span className="text-xs text-brand truncate max-w-[200px]">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} className="text-brand/60 hover:text-brand shrink-0">
              <X size={12} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* File upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach file (image, PDF, CSV, Excel)"
            className="w-10 h-10 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-brand hover:border-brand transition-colors shrink-0"
          >
            <Paperclip size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.csv,.txt,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />

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
            disabled={(!input.trim() && !attachedFile) || loading}
            className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white disabled:opacity-40 transition-opacity shrink-0"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] text-center mt-2">
          Enter to send · Shift+Enter for new line · Attach images, PDFs, CSV, Excel
        </p>
      </div>
    </div>
  )
}
