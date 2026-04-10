import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/get-user-id'

interface ExtractPdfBody {
  pdfBase64: string
  fileName: string
  apiKey: string
  endpoint: string
  extractionModel?: string
}

function validate(body: unknown): body is ExtractPdfBody {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    typeof b.pdfBase64 === 'string' &&
    b.pdfBase64.length > 0 &&
    typeof b.fileName === 'string' &&
    typeof b.apiKey === 'string' &&
    b.apiKey.length > 0 &&
    typeof b.endpoint === 'string'
  )
}

export async function POST(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!validate(body)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { pdfBase64, fileName, apiKey, endpoint, extractionModel } = body
  const base = endpoint.replace(/\/$/, '')
  const model = extractionModel?.trim() || 'qwen3.6-plus'

  // ── Step 1: Upload PDF to DashScope Files API ──────────────────────────────
  const pdfBuffer = Buffer.from(pdfBase64, 'base64')
  const formData = new FormData()
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
  formData.append('file', blob, fileName || 'document.pdf')
  formData.append('purpose', 'file-extract')

  let fileId: string
  try {
    const uploadRes = await fetch(`${base}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    })
    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      return NextResponse.json({ error: `PDF upload failed: ${err}` }, { status: 502 })
    }
    const uploaded = (await uploadRes.json()) as { id: string }
    fileId = uploaded.id
  } catch (err) {
    return NextResponse.json(
      { error: `Upload error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    )
  }

  // ── Step 2: Extract content via qwen-long ──────────────────────────────────
  let extractedText = ''
  try {
    const extractRes = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `fileid://${fileId}`,
          },
          {
            role: 'user',
            content:
              'Extract all content from this document completely and accurately. Include all text, numbers, tables, dates, names, and any other information present. Present it in a clear, readable format.',
          },
        ],
      }),
    })

    if (!extractRes.ok) {
      const err = await extractRes.text()
      return NextResponse.json({ error: `Extraction failed: ${err}` }, { status: 502 })
    }

    const data = (await extractRes.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    extractedText = data.choices?.[0]?.message?.content ?? ''
  } finally {
    // Clean up: delete file from DashScope (fire-and-forget)
    fetch(`${base}/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    }).catch(() => {})
  }

  return NextResponse.json({ extractedText })
}
