import React, { useEffect, useState } from 'react'
import { joinSession } from '../lib/api'
import { butterbase, butterbaseConfigured } from '../lib/butterbase'
import { getCurrentUser, signInOrUp } from '../lib/auth'
import { getOrCreateDevUserId, loadMember, saveMember } from '../lib/member'
import { isLocalDemo } from '../lib/local-demo'
import { shareUrlFor } from '../lib/session-id'

const bp = {
  bg: '#1464b4', border: 'rgba(255,255,255,0.3)',
  font: "'Courier New', monospace", text: '#fff', muted: 'rgba(255,255,255,0.5)',
  input: 'rgba(255,255,255,0.08)'
}

const Field = ({ label, value, onChange, placeholder, optional, type = 'text', minLength }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 3, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      {optional && <span style={{ opacity: 0.4 }}>OPTIONAL</span>}
    </div>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      minLength={minLength}
      required={!optional && type !== 'password'}
      style={{
        width: '100%', background: bp.input, color: bp.text,
        border: `1px solid ${bp.border}`, fontFamily: bp.font,
        fontSize: 13, padding: '10px 12px', outline: 'none'
      }}
    />
  </div>
)

export default function Onboarding({ sessionId, shareUrl, onJoined }) {
  const [authUser, setAuthUser] = useState(null)
  const [authMode, setAuthMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [form, setForm] = useState({ name: '', github: '', linkedin: '' })
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const set = key => val => setForm(f => ({ ...f, [key]: val }))
  const localDemo = isLocalDemo()
  const needsAuth = butterbaseConfigured && !authUser && !localDemo

  useEffect(() => {
    const stored = loadMember(sessionId)
    if (stored?.name && stored?.personId && stored?.userId) {
      onJoined(stored)
      return
    }

    if (butterbaseConfigured) {
      getCurrentUser().then(user => {
        setAuthUser(user)
        if (user?.email) setEmail(user.email)
      })
    }
  }, [sessionId, onJoined])

  async function resolveUserId() {
    if (localDemo || !butterbaseConfigured) {
      return getOrCreateDevUserId()
    }
    if (authUser?.id) return authUser.id
    const user = await signInOrUp({ email, password, mode: authMode })
    setAuthUser(user)
    return user.id
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (!form.github.trim()) {
      setError('GitHub username required — we read your repos to find team overlaps')
      return
    }
    if (needsAuth && (!email.trim() || !password)) {
      setError('Email and password required')
      return
    }

    setLoading(true)
    setError('')
    setStatus(needsAuth ? 'SIGNING IN...' : 'JOINING...')

    try {
      const userId = await resolveUserId()
      setStatus('JOINING...')
      const result = await joinSession(sessionId, {
        userId,
        name: form.name.trim(),
        github: form.github.trim(),
        linkedin: form.linkedin.trim()
      })

      if (result.githubError) {
        setError(`GitHub: ${result.githubError} — add GITHUB_TOKEN to backend/.env if rate limited`)
      } else if (result.enriching) {
        setStatus('FETCHING GITHUB READMES...')
      }

      const member = { name: form.name.trim(), userId, personId: result.personId }
      saveMember(sessionId, member)
      setLoading(false)
      if (!result.githubError) onJoined(member)
      else setTimeout(() => onJoined(member), 1500)
    } catch (err) {
      setError(err.message)
      setStatus('')
      setLoading(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl || shareUrlFor(sessionId))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      height: '100vh', background: bp.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: bp.font
    }}>
      <div style={{ width: 400, maxHeight: '100vh', overflowY: 'auto', padding: '24px 0' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 4 }}>HIVEMIND / {sessionId}</div>
          <div style={{ fontSize: 22, letterSpacing: 4, fontWeight: 700, color: bp.text, marginTop: 6 }}>
            {needsAuth ? 'JOIN HIVEMIND' : 'YOUR PROFILE'}
          </div>
          <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 1, marginTop: 4 }}>
            {localDemo
              ? 'Local demo — join with GitHub; overlaps + project graph auto-build when teammates join.'
              : 'GitHub required — skills, overlaps, and project graph populate automatically.'}
          </div>
        </div>

        {(shareUrl || sessionId) && (
          <div style={{ border: `1px solid ${bp.border}`, padding: '10px 14px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: bp.muted, letterSpacing: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
              {shareUrl || shareUrlFor(sessionId)}
            </span>
            <button type="button" onClick={copyLink} style={{ background: 'transparent', color: copied ? '#ffe066' : bp.muted, border: 'none', fontFamily: bp.font, fontSize: 10, letterSpacing: 2, cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 8 }}>
              {copied ? 'COPIED' : 'COPY LINK'}
            </button>
          </div>
        )}

        {authUser && (
          <div style={{ fontSize: 10, color: '#86efac', letterSpacing: 2, marginBottom: 16 }}>
            SIGNED IN AS {authUser.email}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {needsAuth && (
            <>
              <Field label="EMAIL" value={email} onChange={setEmail} placeholder="you@email.com" type="email" />
              <Field
                label="PASSWORD"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                type="password"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setError('') }}
                style={{ background: 'transparent', border: 'none', color: bp.muted, fontFamily: bp.font, fontSize: 10, letterSpacing: 2, cursor: 'pointer', marginBottom: 20, padding: 0 }}
              >
                {authMode === 'signin' ? 'NEED AN ACCOUNT? SIGN UP' : 'ALREADY HAVE AN ACCOUNT? SIGN IN'}
              </button>
            </>
          )}

          <Field label="NAME" value={form.name} onChange={set('name')} placeholder="Your name" />
          <Field label="GITHUB USERNAME" value={form.github} onChange={set('github')} placeholder="kach0w or github.com/you" />
          <Field label="LINKEDIN" value={form.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/you" optional />

          {error && (
            <div style={{ fontSize: 11, color: '#fca5a5', marginBottom: 12, letterSpacing: 1 }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !form.name.trim() || !form.github.trim()}
            style={{
              width: '100%', background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
              color: loading ? bp.muted : bp.text, border: `1px solid ${bp.border}`,
              fontFamily: bp.font, fontSize: 12, letterSpacing: 4,
              padding: '14px', cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? status : needsAuth ? 'SIGN IN & JOIN' : 'JOIN HIVEMIND'}
          </button>
        </form>
      </div>
    </div>
  )
}
