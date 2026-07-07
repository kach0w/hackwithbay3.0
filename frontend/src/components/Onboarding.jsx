import React, { useState } from 'react'
import { joinSession } from '../lib/api'

const bp = {
  bg: '#1464b4', border: 'rgba(255,255,255,0.3)',
  font: "'Courier New', monospace", text: '#fff', muted: 'rgba(255,255,255,0.5)',
  input: 'rgba(255,255,255,0.08)'
}

const Field = ({ label, value, onChange, placeholder, optional, hint }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 3, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      {optional && <span style={{ opacity: 0.4 }}>OPTIONAL</span>}
    </div>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', background: bp.input, color: bp.text,
        border: `1px solid ${bp.border}`, fontFamily: bp.font,
        fontSize: 13, padding: '10px 12px', outline: 'none'
      }}
    />
    {hint && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{hint}</div>}
  </div>
)

export default function Onboarding({ sessionId, shareUrl, onJoined }) {
  const [form, setForm] = useState({ name: '', github: '', linkedin: '', website: '', interests: '' })
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState(false)

  const set = key => val => setForm(f => ({ ...f, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    setStatus('SCRAPING GITHUB...')
    try {
      setStatus('BUILDING PROFILE...')
      const result = await joinSession(sessionId, form)
      setStatus(`PROFILE COMPLETE · ${result.skills?.length || 0} SKILLS · ${result.domains?.length || 0} DOMAINS`)
      setTimeout(() => onJoined(form.name), 600)
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
      backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,0.04) 0,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 24px),repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 0,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 24px)'
    }}>
      <div style={{ width: 460 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 4 }}>HIVEMIND / {sessionId}</div>
          <div style={{ fontSize: 22, letterSpacing: 4, fontWeight: 700, color: bp.text, marginTop: 6 }}>BUILD YOUR PROFILE</div>
          <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 1, marginTop: 4 }}>
            Claude will scrape your data and form a complete picture of who you are as a builder.
          </div>
        </div>

        {shareUrl && (
          <div style={{ border: `1px solid ${bp.border}`, padding: '10px 14px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: bp.muted, letterSpacing: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>
              {shareUrl}
            </span>
            <button onClick={copyLink} style={{ background: 'transparent', color: copied ? '#ffe066' : bp.muted, border: 'none', fontFamily: bp.font, fontSize: 10, letterSpacing: 2, cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 8 }}>
              {copied ? 'COPIED' : 'COPY LINK'}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Field label="NAME" value={form.name} onChange={set('name')} placeholder="Your name" />
          <Field label="GITHUB USERNAME" value={form.github} onChange={set('github')} placeholder="kach0w" optional hint="Repos + stars scraped for skills and domains" />
          <Field label="LINKEDIN" value={form.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/username or just username" optional hint="Roles, companies, industries" />
          <Field label="PERSONAL WEBSITE" value={form.website} onChange={set('website')} placeholder="yoursite.com" optional hint="Writing topics and what you think about" />
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 3, marginBottom: 4 }}>INTERESTS & CURIOSITIES <span style={{ opacity: 0.4 }}>OPTIONAL</span></div>
            <textarea
              value={form.interests}
              onChange={e => setForm(f => ({ ...f, interests: e.target.value }))}
              placeholder="What are you most curious about? What problem do you hate? What would you build with 6 months?"
              rows={3}
              style={{ width: '100%', background: bp.input, color: bp.text, border: `1px solid ${bp.border}`, fontFamily: bp.font, fontSize: 13, padding: '10px 12px', outline: 'none', resize: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            style={{
              width: '100%', background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
              color: loading ? bp.muted : bp.text, border: `1px solid ${bp.border}`,
              fontFamily: bp.font, fontSize: 12, letterSpacing: 4,
              padding: '14px', cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? status : 'JOIN HIVEMIND'}
          </button>
        </form>
      </div>
    </div>
  )
}
