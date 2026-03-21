import type { ChatMessage } from '../engine'

function toOpenAIContent(msg: ChatMessage): string | { type: string; text?: string; image_url?: { url: string } }[] {
  if (typeof msg.content === 'string') return msg.content
  return msg.content.map((block) => {
    if (block.type === 'text') return { type: 'text', text: block.text }
    if (block.type === 'image') return { type: 'image_url', image_url: { url: `data:${block.mediaType};base64,${block.data}` } }
    // PDF not natively supported by OpenAI — fall back to text note
    return { type: 'text', text: '[A PDF document was attached — please describe its content in text if needed]' }
  })
}

export async function* streamOpenAI(
  messages: ChatMessage[],
  systemPrompt: string,
  apiKey: string,
  model: string,
  endpoint: string,
): AsyncGenerator<string> {
  const base = endpoint.replace(/\/$/, '')
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: toOpenAIContent(m) })),
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${err}`)
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
        const delta = json.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {}
    }
  }
}
