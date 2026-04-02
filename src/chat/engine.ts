import type { ApiProvider } from '@/store/app-store'

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: string; data: string }
  | { type: 'document'; mediaType: 'application/pdf'; data: string }

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

/**
 * Stream chat via the server-side proxy at /api/chat.
 * The API key is sent to our own server, which forwards it to the AI provider —
 * it never leaves our domain in the browser's network tab.
 */
export async function* streamChat(
  messages: ChatMessage[],
  systemPrompt: string,
  provider: ApiProvider,
  apiKey: string,
  model: string,
  endpoint: string,
): AsyncGenerator<string> {
  if (!apiKey.trim()) {
    yield "I don't have an API key configured. Please go to **Settings** and add your API key to use the chatbot."
    return
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemPrompt, provider, apiKey, model, endpoint }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error')
    throw new Error(`Chat error ${res.status}: ${err}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        if (typeof parsed === 'string') {
          yield parsed
        } else if (parsed.error) {
          throw new Error(parsed.error)
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }
}
