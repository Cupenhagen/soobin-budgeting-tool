import { streamAnthropic } from './providers/anthropic'
import { streamOpenAI } from './providers/openai'
import { streamAlibaba } from './providers/alibaba'
import type { ApiProvider } from '@/store/app-store'

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: string; data: string }
  | { type: 'document'; mediaType: 'application/pdf'; data: string }

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

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

  switch (provider) {
    case 'anthropic':
      yield* streamAnthropic(messages, systemPrompt, apiKey, model, endpoint)
      break
    case 'alibaba':
      yield* streamAlibaba(
        messages.map((m) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : m.content.map((b) => b.type === 'text' ? b.text : '[file attached]').join('\n') })),
        systemPrompt, apiKey, model, endpoint,
      )
      break
    case 'openai':
    case 'custom':
    default:
      yield* streamOpenAI(messages, systemPrompt, apiKey, model, endpoint)
      break
  }
}
