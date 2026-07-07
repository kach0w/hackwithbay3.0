import React, { useState } from 'react'
import { createSession } from '../lib/api'

const bp = {
  bg: '#1464b4', border: 'rgba(255,255,255,0.3)',
  font: "'Courier New', monospace", text: '#fff', muted: 'rgba(255,255,255,0.5)'
}

export default function Landing({ onSession }) {
  const [joinId, setJoinId] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    setLoading(true)
    const { sessionId } = await createSession()
    const url = `${window.location.origin}?s=${sessionId}`
    onSession(sessionId, url)
    setLoading(false)
  }

  function handleJoin(e) {
    e.preventDefault()
    if (joinId.trim()) onSession(joinId.trim(), null)
  }

  return (
    <div style={{
      height: '100vh', background: bp.bg, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: bp.font, color: bp.text,
      backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 24px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 24px)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 32, letterSpacing: 8, fontWeight: 700 }}>HIVEMIND</div>
        <div style={{ fontSize: 11, color: bp.muted, letterSpacing: 4, marginTop: 8 }}>
          SHARED PROJECT MEMORY SYSTEM
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, width: 380 }}>
        {/* Create */}
        <div style={{ border: `1px solid ${bp.border}`, padding: 24 }}>
          <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 3, marginBottom: 16 }}>
            NEW SESSION
          </div>
          <button
            onClick={handleCreate}
            disabled={loading}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.1)',
              color: bp.text, border: `1px solid ${bp.border}`,
              fontFamily: bp.font, fontSize: 12, letterSpacing: 3,
              padding: '12px', cursor: 'pointer'
            }}
          >
            {loading ? 'CREATING...' : 'CREATE HIVEMIND'}
          </button>
        </div>

        {/* Join */}
        <div style={{ border: `1px solid ${bp.border}`, padding: 24 }}>
          <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 3, marginBottom: 16 }}>
            JOIN EXISTING SESSION
          </div>
          <form onSubmit={handleJoin} style={{ display: 'flex', gap: 8 }}>
            <input
              value={joinId}
              onChange={e => setJoinId(e.target.value)}
              placeholder="SESSION ID"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.08)',
                color: bp.text, border: `1px solid ${bp.border}`,
                fontFamily: bp.font, fontSize: 12, letterSpacing: 2,
                padding: '10px 12px', outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                background: 'transparent', color: bp.text,
                border: `1px solid ${bp.border}`, fontFamily: bp.font,
                fontSize: 11, letterSpacing: 2, padding: '10px 16px', cursor: 'pointer'
              }}
            >
              JOIN
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
