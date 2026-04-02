import type { ChatMessage } from '../engine'

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }

function toAnthropicContent(msg: ChatMessage): AnthropicContentBlock[] | string {
  if (typeof msg.content === 'string') return msg.content
  return msg.content.map((block) => {
    if (block.type === 'text') return { type: 'text' as const, text: block.text }
    if (block.type === 'image') return { type: 'image' as const, source: { type: 'base64' as const, media_type: block.mediaType, data: block.data } }
    if (block.type === 'document') return { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: block.data } }
    return { type: 'text' as const, text: '' }
  })
}

export async function* streamAnthropic(
  messages: ChatMessage[],
  systemPrompt: string,
  apiKey: string,
  model: string,
  endpoint: string,
): AsyncGenerator<string> {
  const base = endpoint.replace(/\/$/, '')
  const res = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'pdfs-2024-09-25',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: toAnthropicContent(m) })),
      stream: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic error ${res.status}: ${err}`)
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
        const json = JSON.parse(data)
        if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
          yield json.delta.text
        }
      } catch {}
    }
  }
}
