'use client'
import { useState } from 'react'
import { useAppStore, type Theme, type ApiProvider } from '@/store/app-store'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { APP_NAME, BOT_NAME } from '@/lib/constants'

const PROVIDERS: { value: ApiProvider; label: string }[] = [
  { value: 'alibaba',    label: 'Alibaba / Qwen' },
  { value: 'anthropic',  label: 'Anthropic (Claude)' },
  { value: 'openai',     label: 'OpenAI' },
  { value: 'custom',     label: 'Custom Endpoint' },
]

const DEFAULT_MODELS: Record<ApiProvider, string> = {
  alibaba:   'qwen-plus',
  anthropic: 'claude-sonnet-4-6',
  openai:    'gpt-4o',
  custom:    '',
}

const DEFAULT_ENDPOINTS: Record<ApiProvider, string> = {
  alibaba:   'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  anthropic: 'https://api.anthropic.com',
  openai:    'https://api.openai.com/v1',
  custom:    '',
}

export default function SettingsPage() {
  const { userName, theme, apiProvider, apiKey, apiModel, apiEndpoint, setUserName, setTheme, setApiConfig } = useAppStore()

  const [nameInput, setNameInput]       = useState(userName)
  const [apiProviderInput, setApiProviderInput] = useState<ApiProvider>(apiProvider)
  const [apiKeyInput, setApiKeyInput]   = useState(apiKey)
  const [apiModelInput, setApiModelInput] = useState(apiModel)
  const [apiEndpointInput, setApiEndpointInput] = useState(apiEndpoint)
  const [saved, setSaved]               = useState(false)
  const [testing, setTesting]           = useState(false)
  const [testResult, setTestResult]     = useState<'success' | 'error' | null>(null)
  const [testMessage, setTestMessage]   = useState('')

  const handleProviderChange = (p: ApiProvider) => {
    setApiProviderInput(p)
    setApiModelInput(DEFAULT_MODELS[p])
    setApiEndpointInput(DEFAULT_ENDPOINTS[p])
  }

  const handleTestKey = async () => {
    if (!apiKeyInput.trim() || !apiEndpointInput.trim()) {
      setTestResult('error')
      setTestMessage('Enter an API key and endpoint first.')
      return
    }
    setTesting(true)
    setTestResult(null)
    setTestMessage('')
    try {
      // Test key via server-side proxy — never send the key directly to third-party from browser
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'hi' }],
          systemPrompt: 'Reply with OK.',
          provider: apiProviderInput,
          apiKey: apiKeyInput,
          model: apiModelInput || 'gpt-4o',
          endpoint: apiEndpointInput,
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) {
        setTestResult('success')
        setTestMessage('Connected! Key is valid.')
      } else {
        const text = await res.text().catch(() => '')
        setTestResult('error')
        setTestMessage(`HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`)
      }
    } catch (e) {
      setTestResult('error')
      setTestMessage(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    if (nameInput.trim()) setUserName(nameInput.trim())
    setApiConfig({ provider: apiProviderInput, key: apiKeyInput, model: apiModelInput, endpoint: apiEndpointInput })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto px-m py-m space-y-m">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Settings</h1>

      {/* Profile */}
      <Card>
        <CardHeader title="Profile" />
        <Input label="Your Name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader title="Appearance" />
        <Select label="Theme" value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </Select>
      </Card>

      {/* API Gateway */}
      <Card>
        <CardHeader title="AI Chatbot Gateway" subtitle={`Configure ${BOT_NAME}'s LLM provider`} />
        <div className="space-y-3">
          <Select label="Provider" value={apiProviderInput} onChange={(e) => handleProviderChange(e.target.value as ApiProvider)}>
            {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
          <Input
            label="API Key"
            type="password"
            placeholder="sk-… or your API key"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
          />
          <Input label="Model" placeholder="e.g. qwen-plus" value={apiModelInput} onChange={(e) => setApiModelInput(e.target.value)} />
          <Input label="Endpoint URL" placeholder="https://…" value={apiEndpointInput} onChange={(e) => setApiEndpointInput(e.target.value)} />

          {/* Test connection */}
          <Button variant="ghost" size="sm" loading={testing} onClick={handleTestKey} className="w-full mt-1">
            {testing ? 'Testing…' : '🔌 Test Connection'}
          </Button>
          {testResult && (
            <p className={`text-xs text-center px-2 py-1.5 rounded-lg ${
              testResult === 'success' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
            }`}>
              {testMessage}
            </p>
          )}
        </div>
      </Card>

      <Button className="w-full" size="lg" onClick={handleSave}>
        {saved ? '✓ Saved!' : 'Save Settings'}
      </Button>

      <p className="text-xs text-center text-[var(--text-tertiary)]">
        {APP_NAME} v0.1 — All data stored locally on your device
      </p>
    </div>
  )
}
