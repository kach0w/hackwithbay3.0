import React, { useEffect, useState } from 'react'
import { joinSession } from '../lib/api'
import { butterbase, butterbaseConfigured } from '../lib/butterbase'
import { getCurrentUser, signInOrUp } from '../lib/auth'
import { getOrCreateDevUserId, loadMember, saveMember } from '../lib/member'

const bp = {
  bg: '#1464b4', border: 'rgba(255,255,255,0.3)',
  font: "'Courier New', monospace", text: '#fff', muted: 'rgba(255,255,255,0.5)',
  input: 'rgba(255,255,255,0.08)'
}

const Field = ({ label, value, onChange, placeholder, optional, hint, type = 'text', minLength }) => (
  <div style={{ marginBottom: 18 }}>
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
    {hint && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{hint}</div>}
  </div>
)

export default function Onboarding({ sessionId, shareUrl, onJoined }) {
  const [authUser, setAuthUser] = useState(null)
  const [authMode, setAuthMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [form, setForm] = useState({
    name:      'Karthik Sabhanayakam',
    github:    'kach0w',
    linkedin:  'linkedin.com/in/karsab',
    website:   'kach0w.github.io',
    interests: ''
  })
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const set = key => val => setForm(f => ({ ...f, [key]: val }))
  const needsAuth = butterbaseConfigured && !authUser

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
    if (butterbaseConfigured) {
      if (authUser?.id) return authUser.id
      const user = await signInOrUp({ email, password, mode: authMode })
      setAuthUser(user)
      return user.id
    }
    return getOrCreateDevUserId()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (needsAuth && (!email.trim() || !password)) {
      setError('Email and password required')
      return
    }

    setLoading(true)
    setError('')
    setStatus(needsAuth ? 'SIGNING IN...' : 'BUILDING PROFILE...')

    try {
      const userId = await resolveUserId()
      setStatus('BUILDING PROFILE...')
      const result = await joinSession(sessionId, { userId, ...form })

      const member = {
        name: form.name,
        userId,
        personId: result.personId
      }
      saveMember(sessionId, member)

      if (result.alreadyJoined) {
        setStatus('WELCOME BACK')
      } else {
        setStatus(`PROFILE COMPLETE · ${result.skills?.length || 0} SKILLS · ${result.domains?.length || 0} DOMAINS`)
      }
      setTimeout(() => onJoined(member), 600)
    } catch (err) {
      setError(err.message)
      setStatus('')
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
      <div style={{ width: 460, maxHeight: '100vh', overflowY: 'auto', padding: '24px 0' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 4 }}>HIVEMIND / {sessionId}</div>
          <div style={{ fontSize: 22, letterSpacing: 4, fontWeight: 700, color: bp.text, marginTop: 6 }}>
            {needsAuth ? 'JOIN HIVEMIND' : 'BUILD YOUR PROFILE'}
          </div>
          <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 1, marginTop: 4 }}>
            {needsAuth
              ? 'Sign in and fill your profile — Claude builds your builder graph from your links.'
              : 'Claude will scrape your data and form a complete picture of who you are as a builder.'}
          </div>
        </div>

        {shareUrl && (
          <div style={{ border: `1px solid ${bp.border}`, padding: '10px 14px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: bp.muted, letterSpacing: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>
              {shareUrl}
            </span>
            <button type="button" onClick={copyLink} style={{ background: 'transparent', color: copied ? '#ffe066' : bp.muted, border: 'none', fontFamily: bp.font, fontSize: 10, letterSpacing: 2, cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 8 }}>
              {copied ? 'COPIED' : 'COPY LINK'}
            </button>
          </div>
        )}

        {authUser && (
          <div style={{ fontSize: 10, color: '#86efac', letterSpacing: 2, marginBottom: 20 }}>
            SIGNED IN AS {authUser.email}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {needsAuth && (
            <>
              <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 3, marginBottom: 12 }}>ACCOUNT</div>
              <Field label="EMAIL" value={email} onChange={setEmail} placeholder="you@email.com" type="email" />
              <Field
                label="PASSWORD"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                type="password"
                minLength={8}
                hint={authMode === 'signup' ? '8+ chars with upper, lower, number, and special character' : undefined}
              />
              <button
                type="button"
                onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setError('') }}
                style={{ background: 'transparent', border: 'none', color: bp.muted, fontFamily: bp.font, fontSize: 10, letterSpacing: 2, cursor: 'pointer', marginBottom: 24, padding: 0 }}
              >
                {authMode === 'signin' ? 'NEED AN ACCOUNT? SIGN UP' : 'ALREADY HAVE AN ACCOUNT? SIGN IN'}
              </button>
            </>
          )}

          <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 3, marginBottom: 12 }}>PROFILE</div>
          <Field label="NAME" value={form.name} onChange={set('name')} placeholder="Your name" />
          <Field label="GITHUB USERNAME" value={form.github} onChange={set('github')} placeholder="kach0w" optional hint="Repos + stars scraped for skills and domains" />
          <Field label="LINKEDIN" value={form.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/username" optional hint="Roles, companies, industries" />
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

          {error && (
            <div style={{ fontSize: 11, color: '#fca5a5', marginBottom: 12, letterSpacing: 1 }}>{error}</div>
          )}

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
            {loading ? status : needsAuth ? 'SIGN IN & JOIN' : 'JOIN HIVEMIND'}
          </button>
        </form>
      </div>
    </div>
  )
}
