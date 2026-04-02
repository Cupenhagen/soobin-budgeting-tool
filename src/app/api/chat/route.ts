import { NextRequest } from 'next/server'
import { getUserId } from '@/lib/get-user-id'
import { rateLimit } from '@/lib/rate-limit'
import { streamAnthropic } from '@/chat/providers/anthropic'
import { streamOpenAI } from '@/chat/providers/openai'
import { streamAlibaba } from '@/chat/providers/alibaba'
import type { ChatMessage } from '@/chat/engine'
import type { ApiProvider } from '@/store/app-store'

interface ChatRequestBody {
  messages: ChatMessage[]
  systemPrompt: string
  provider: ApiProvider
  apiKey: string
  model: string
  endpoint: string
}

const VALID_PROVIDERS = new Set<string>(['anthropic', 'openai', 'alibaba', 'custom'])

function validate(body: unknown): body is ChatRequestBody {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    Array.isArray(b.messages) &&
    typeof b.systemPrompt === 'string' &&
    typeof b.provider === 'string' &&
    VALID_PROVIDERS.has(b.provider) &&
    typeof b.apiKey === 'string' &&
    b.apiKey.length > 0 &&
    typeof b.model === 'string' &&
    typeof b.endpoint === 'string'
  )
}

export async function POST(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  // Rate limit: 20 chat requests per minute per user
  const rl = rateLimit(`chat:${userId}`, 20, 60_000)
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait a moment.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil((rl.retryAfterMs ?? 0) / 1000)) },
    })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  if (!validate(body)) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const { messages, systemPrompt, provider, apiKey, model, endpoint } = body

  let generator: AsyncGenerator<string>
  switch (provider) {
    case 'anthropic':
      generator = streamAnthropic(messages, systemPrompt, apiKey, model, endpoint)
      break
    case 'alibaba':
      generator = streamAlibaba(messages, systemPrompt, apiKey, model, endpoint)
      break
    case 'openai':
    case 'custom':
    default:
      generator = streamOpenAI(messages, systemPrompt, apiKey, model, endpoint)
      break
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream error'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
