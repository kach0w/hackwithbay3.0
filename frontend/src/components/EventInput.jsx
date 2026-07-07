import React, { useState } from 'react'
import { postEvent } from '../lib/api'

const bp = {
  bg: '#0d4f8c', border: 'rgba(255,255,255,0.3)',
  input: 'rgba(255,255,255,0.08)', text: '#ffffff',
  muted: 'rgba(255,255,255,0.45)', font: "'Courier New', monospace",
}

export default function EventInput({ sessionId, member, onResult }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [last, setLast] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    try {
      const result = await postEvent(sessionId, text, member)
      setLast(result)
      setText('')
      onResult?.(result)
    } catch (err) {
      setLast({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: bp.bg, borderTop: `2px solid ${bp.border}`, padding: '12px 20px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: bp.muted, fontFamily: bp.font, letterSpacing: 2, whiteSpace: 'nowrap' }}>
          {member?.name?.toUpperCase()}
        </span>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder='e.g. "switching user-service from Postgres to Neo4j"'
          disabled={loading}
          style={{
            flex: 1, background: bp.input, color: bp.text,
            border: `1px solid ${bp.border}`, fontFamily: bp.font,
            fontSize: 13, padding: '6px 12px', outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          style={{
            background: 'transparent', color: bp.text,
            border: `1px solid ${bp.border}`, fontFamily: bp.font,
            fontSize: 11, letterSpacing: 3, padding: '6px 20px',
            cursor: loading ? 'wait' : 'pointer',
            opacity: (!text.trim() || loading) ? 0.4 : 1
          }}
        >
          {loading ? 'PROCESSING...' : 'COMMIT'}
        </button>
      </form>

      {last && (
        <div style={{ marginTop: 8, fontSize: 10, fontFamily: bp.font, letterSpacing: 1, color: bp.muted }}>
          {last.error ? (
            <span style={{ color: '#fca5a5' }}>ERROR: {last.error}</span>
          ) : (
            <>
              INTENT: <span style={{ color: '#ffe066' }}>{last.intent?.toUpperCase()}</span>
              {last.affected?.length > 0 && (
                <span style={{ marginLeft: 20, color: '#ff9999' }}>
                  NOTIFY → {last.affected.map(a => a.notify?.toUpperCase()).join(', ')}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
