import React, { useState } from 'react'
import { postEvent } from '../lib/api'

const AUTHORS = ['Shreeya', 'Frank', 'Ryan', 'Priya']

export default function EventInput({ onResult }) {
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('Shreeya')
  const [loading, setLoading] = useState(false)
  const [last, setLast] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    try {
      const result = await postEvent(text, author)
      setLast(result)
      onResult(result)
      setText('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 16, borderTop: '1px solid #1e293b', background: '#0f172a' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={author}
          onChange={e => setAuthor(e.target.value)}
          style={{ background: '#1e293b', color: '#f9fafb', border: '1px solid #334155', padding: '8px', borderRadius: 4 }}
        >
          {AUTHORS.map(a => <option key={a}>{a}</option>)}
        </select>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder='e.g. "switching user-service from Postgres to Neo4j"'
          disabled={loading}
          style={{
            flex: 1, background: '#1e293b', color: '#f9fafb',
            border: '1px solid #334155', padding: '8px 12px',
            borderRadius: 4, fontFamily: 'monospace', fontSize: 14
          }}
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          style={{
            background: '#3b82f6', color: '#fff', border: 'none',
            padding: '8px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 600
          }}
        >
          {loading ? '...' : 'Send'}
        </button>
      </form>

      {last && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
          intent: <span style={{ color: '#60a5fa' }}>{last.intent}</span>
          {last.affected?.length > 0 && (
            <span style={{ marginLeft: 16, color: '#f87171' }}>
              notify: {last.affected.map(a => a.notify).join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
