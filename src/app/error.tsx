'use client'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: '#dc2626' }}>Runtime Error</h2>
      <pre style={{
        background: '#fef2f2',
        border: '1px solid #fca5a5',
        padding: '1rem',
        borderRadius: '8px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        color: '#991b1b',
      }}>
        {error.message}
      </pre>
      {error.stack && (
        <pre style={{
          background: '#f5f5f5',
          padding: '1rem',
          borderRadius: '8px',
          fontSize: '12px',
          whiteSpace: 'pre-wrap',
          marginTop: '1rem',
          color: '#374151',
        }}>
          {error.stack}
        </pre>
      )}
      {error.digest && (
        <p style={{ color: '#6b7280', fontSize: '12px' }}>Digest: {error.digest}</p>
      )}
      <button
        onClick={reset}
        style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
      >
        Try again
      </button>
    </div>
  )
}
