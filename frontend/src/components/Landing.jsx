import React, { useEffect, useState } from 'react'
import { createSession } from '../lib/api'
import { butterbase, butterbaseConfigured } from '../lib/butterbase'
import { getCurrentUser, signInOrUp } from '../lib/auth'

const bp = {
  bg: '#1464b4', border: 'rgba(255,255,255,0.3)',
  font: "'Courier New', monospace", text: '#fff', muted: 'rgba(255,255,255,0.5)',
  input: 'rgba(255,255,255,0.08)'
}

const S = {
  input: {
    width: '100%', background: bp.input, color: bp.text,
    border: `1px solid ${bp.border}`, fontFamily: bp.font,
    fontSize: 12, letterSpacing: 1, padding: '10px 12px', outline: 'none'
  },
  btn: (primary) => ({
    width: '100%', background: primary ? 'rgba(255,255,255,0.12)' : 'transparent',
    color: bp.text, border: `1px solid ${bp.border}`,
    fontFamily: bp.font, fontSize: 11, letterSpacing: 3,
    padding: '12px', cursor: 'pointer'
  }),
  label: { fontSize: 10, color: bp.muted, letterSpacing: 3, marginBottom: 10, display: 'block' },
  panel: { border: `1px solid ${bp.border}`, padding: 24, marginBottom: 0 }
}

function BgGrid() {
  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none',
      backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,0.05) 0,rgba(255,255,255,0.05) 1px,transparent 1px,transparent 28px),repeating-linear-gradient(90deg,rgba(255,255,255,0.05) 0,rgba(255,255,255,0.05) 1px,transparent 1px,transparent 28px)'
    }} />
  )
}

export default function Landing({ onSession }) {
  const [joinId,   setJoinId]   = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [authUser, setAuthUser] = useState(null)
  const [authErr,  setAuthErr]  = useState('')
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (!butterbaseConfigured) return
    getCurrentUser().then(user => {
      setAuthUser(user)
      if (user?.email) setEmail(user.email)
    })
    if (!butterbase) return
    const { unsubscribe } = butterbase.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
    })
    return unsubscribe
  }, [])

  async function handleAuth(e) {
    e.preventDefault()
    if (!butterbaseConfigured) return
    setAuthErr('')
    setLoading(true)
    try {
      const user = await signInOrUp({ email, password, mode: authMode })
      setAuthUser(user)
    } catch (err) {
      setAuthErr(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    if (butterbase) await butterbase.auth.signOut()
    setAuthUser(null)
  }

  async function handleCreate() {
    setLoading(true)
    try {
      const { sessionId } = await createSession()
      onSession(sessionId, `${window.location.origin}?s=${sessionId}`)
    } finally {
      setLoading(false)
    }
  }

  function handleJoin(e) {
    e.preventDefault()
    if (joinId.trim()) onSession(joinId.trim(), null)
  }

  return (
    <div style={{ height: '100vh', background: bp.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: bp.font, color: bp.text }}>
      <BgGrid />

      <div style={{ textAlign: 'center', marginBottom: 52, position: 'relative' }}>
        <div style={{ fontSize: 36, letterSpacing: 10, fontWeight: 700 }}>HIVEMIND</div>
        <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 5, marginTop: 10 }}>SHARED PROJECT MEMORY SYSTEM</div>
      </div>

      <div style={{ display: 'flex', gap: 24, position: 'relative', alignItems: 'flex-start' }}>

        {butterbaseConfigured && (
          <div style={{ ...S.panel, width: 300 }}>
            {authUser ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#86efac', letterSpacing: 2, marginBottom: 12 }}>
                  SIGNED IN ✓
                </div>
                <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 1, marginBottom: 16 }}>
                  {authUser.email}
                </div>
                <button type="button" onClick={handleSignOut} style={S.btn(false)}>
                  SIGN OUT
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', marginBottom: 16, gap: 0 }}>
                  {['login', 'signup'].map(m => (
                    <button key={m} type="button" onClick={() => setAuthMode(m)} style={{
                      flex: 1, background: 'transparent', color: authMode === m ? bp.text : bp.muted,
                      border: 'none', borderBottom: `1px solid ${authMode === m ? bp.text : 'rgba(255,255,255,0.15)'}`,
                      fontFamily: bp.font, fontSize: 10, letterSpacing: 3, padding: '8px', cursor: 'pointer'
                    }}>
                      {m === 'login' ? 'SIGN IN' : 'SIGN UP'}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="EMAIL" type="email" required style={S.input} />
                  <input value={password} onChange={e => setPassword(e.target.value)} placeholder="PASSWORD" type="password" minLength={8} required style={S.input} />
                  {authMode === 'signup' && (
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>
                      8+ chars with upper, lower, number, and special character
                    </div>
                  )}
                  {authErr && <div style={{ fontSize: 10, color: '#fca5a5', letterSpacing: 1 }}>{authErr}</div>}
                  <button type="submit" disabled={loading} style={S.btn(true)}>
                    {loading ? '...' : authMode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 300 }}>
          <div style={S.panel}>
            <span style={S.label}>NEW SESSION</span>
            <button onClick={handleCreate} disabled={loading} style={S.btn(true)}>
              {loading ? 'CREATING...' : 'CREATE HIVEMIND'}
            </button>
          </div>

          <div style={S.panel}>
            <span style={S.label}>JOIN EXISTING</span>
            <form onSubmit={handleJoin} style={{ display: 'flex', gap: 8 }}>
              <input
                value={joinId}
                onChange={e => setJoinId(e.target.value)}
                placeholder="SESSION ID"
                style={{ ...S.input, flex: 1 }}
              />
              <button type="submit" style={{ ...S.btn(false), width: 'auto', padding: '10px 16px', whiteSpace: 'nowrap' }}>
                JOIN
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}
