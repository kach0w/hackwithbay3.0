import React, { useState } from 'react'
import { joinSession } from '../lib/api'

const bp = {
  bg: '#1464b4', border: 'rgba(255,255,255,0.3)',
  font: "'Courier New', monospace", text: '#fff', muted: 'rgba(255,255,255,0.5)',
  input: 'rgba(255,255,255,0.08)'
}

const Field = ({ label, value, onChange, placeholder, optional }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 3, marginBottom: 6 }}>
      {label}{optional && <span style={{ marginLeft: 8, opacity: 0.5 }}>OPTIONAL</span>}
    </div>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', background: bp.input, color: bp.text,
        border: `1px solid ${bp.border}`, fontFamily: bp.font,
        fontSize: 13, padding: '10px 12px', outline: 'none', letterSpacing: 0.5
      }}
    />
  </div>
)

export default function Onboarding({ sessionId, shareUrl, onJoined }) {
  const [form, setForm] = useState({ name: '', github: '', linkedin: '', twitter: '', interests: '' })
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState(false)

  const set = key => val => setForm(f => ({ ...f, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    setStatus('INGESTING GITHUB...')
    try {
      const result = await joinSession(sessionId, form)
      setStatus(`FOUND ${result.skills?.length || 0} SKILLS · ${result.domains?.length || 0} DOMAINS`)
      setTimeout(() => onJoined(form.name), 800)
    } catch (err) {
      setStatus(`ERROR: ${err.message}`)
      setLoading(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl || `${window.location.origin}?s=${sessionId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      height: '100vh', background: bp.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: bp.font,
      backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 24px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 24px)'
    }}>
      <div style={{ width: 440 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: bp.muted, letterSpacing: 4 }}>HIVEMIND / SESSION {sessionId}</div>
          <div style={{ fontSize: 20, letterSpacing: 4, fontWeight: 700, color: bp.text, marginTop: 8 }}>
            JOIN THE BRAIN
          </div>
        </div>

        {/* Share link */}
        {shareUrl && (
          <div style={{ border: `1px solid ${bp.border}`, padding: 12, marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: bp.muted, letterSpacing: 1 }}>
              SHARE: {shareUrl}
            </span>
            <button
              onClick={copyLink}
              style={{ background: 'transparent', color: copied ? '#ffe066' : bp.text, border: 'none', fontFamily: bp.font, fontSize: 10, letterSpacing: 2, cursor: 'pointer' }}
            >
              {copied ? 'COPIED' : 'COPY'}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Field label="NAME" value={form.name} onChange={set('name')} placeholder="Your name" />
          <Field label="GITHUB USERNAME" value={form.github} onChange={set('github')} placeholder="kach0w" optional />
          <Field label="LINKEDIN URL" value={form.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/..." optional />
          <Field label="TWITTER / X HANDLE" value={form.twitter} onChange={set('twitter')} placeholder="@handle" optional />
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 3, marginBottom: 6 }}>
              INTERESTS & CURIOSITIES
            </div>
            <textarea
              value={form.interests}
              onChange={e => setForm(f => ({ ...f, interests: e.target.value }))}
              placeholder="What are you curious about? What would you build with 6 months?"
              rows={3}
              style={{
                width: '100%', background: bp.input, color: bp.text,
                border: `1px solid ${bp.border}`, fontFamily: bp.font,
                fontSize: 13, padding: '10px 12px', outline: 'none',
                resize: 'none', letterSpacing: 0.5
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            style={{
              width: '100%', background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)',
              color: bp.text, border: `1px solid ${bp.border}`,
              fontFamily: bp.font, fontSize: 12, letterSpacing: 4,
              padding: '14px', cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? status || 'PROCESSING...' : 'JOIN HIVEMIND'}
          </button>
        </form>
      </div>
    </div>
  )
}
