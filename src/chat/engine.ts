import { streamAnthropic } from './providers/anthropic'
import { streamOpenAI } from './providers/openai'
import { streamAlibaba } from './providers/alibaba'
import type { ApiProvider } from '@/store/app-store'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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

  // Only send role/content to the LLM (no extra fields)
  const msgs = messages.map((m) => ({ role: m.role, content: m.content }))

  switch (provider) {
    case 'anthropic':
      yield* streamAnthropic(msgs, systemPrompt, apiKey, model, endpoint)
      break
    case 'alibaba':
      yield* streamAlibaba(msgs, systemPrompt, apiKey, model, endpoint)
      break
    case 'openai':
    case 'custom':
    default:
      yield* streamOpenAI(msgs, systemPrompt, apiKey, model, endpoint)
      break
  }
}
