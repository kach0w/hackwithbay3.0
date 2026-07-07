import React, { useEffect, useState } from 'react'
import { createSession } from '../lib/api'
import { getApiBase, setApiBase } from '../lib/api-config'
import { butterbase, butterbaseConfigured } from '../lib/butterbase'
import { getCurrentUser, signInOrUp } from '../lib/auth'
import { billingConfigured, hasTeamPass, startTeamPassCheckout } from '../lib/billing'

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
  const [unlocked, setUnlocked] = useState(!billingConfigured())
  const [authReady, setAuthReady] = useState(true)
  const [passChecked, setPassChecked] = useState(!billingConfigured())
  const [payErr,   setPayErr]   = useState('')
  const [backendUrl, setBackendUrl] = useState('')
  const [apiStatus, setApiStatus] = useState('')

  useEffect(() => {
    setBackendUrl(getApiBase())
    setApiStatus(getApiBase() ? `API: ${getApiBase()}` : '')
  }, [])

  async function refreshTeamPass() {
    if (!billingConfigured()) {
      setUnlocked(true)
      setPassChecked(true)
      return
    }
    setPassChecked(false)
    try {
      setUnlocked(await hasTeamPass())
    } catch (err) {
      setUnlocked(false)
      setPayErr(err.message)
    } finally {
      setPassChecked(true)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('purchase') === 'success') {
      window.history.replaceState({}, '', window.location.pathname)
      refreshTeamPass()
    }
  }, [])

  useEffect(() => {
    if (!butterbaseConfigured) return
    let cancelled = false
    getCurrentUser().then(async user => {
      if (cancelled) return
      setAuthUser(user)
      if (user?.email) setEmail(user.email)
      setAuthReady(true)
      if (user) await refreshTeamPass()
      else {
        setUnlocked(false)
        setPassChecked(true)
      }
    })
    if (!butterbase) return
    const { unsubscribe } = butterbase.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!authUser || !billingConfigured()) return
    refreshTeamPass()
  }, [authUser])

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
    setUnlocked(!billingConfigured())
  }

  async function handleUnlock() {
    if (!authUser) {
      setPayErr('Sign in first to purchase a Team Pass')
      return
    }
    setPayErr('')
    setLoading(true)
    try {
      await startTeamPassCheckout()
    } catch (err) {
      setPayErr(err.message)
      setLoading(false)
    }
  }

  async function handleSaveBackend(e) {
    e.preventDefault()
    setPayErr('')
    setLoading(true)
    try {
      const url = await setApiBase(backendUrl)
      setApiStatus(`API: ${url}`)
    } catch (err) {
      setPayErr(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate({ bypassBilling = false } = {}) {
    setPayErr('')
    if (billingConfigured() && !bypassBilling) {
      if (!authUser) {
        setPayErr('Sign in to create a hivemind')
        return
      }
      if (!passChecked) {
        setPayErr('Checking Team Pass status…')
        return
      }
      if (!unlocked) {
        setPayErr('Unlock a Team Pass first (free via Butterbase Payments)')
        return
      }
    }
    setLoading(true)
    try {
      const { sessionId } = await createSession()
      onSession(sessionId, `${window.location.origin}?s=${sessionId}`)
    } catch (err) {
      setPayErr(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleJoin(e) {
    e.preventDefault()
    if (joinId.trim()) onSession(joinId.trim(), null)
  }

  const actionLoading = loading || (billingConfigured() && authUser && !passChecked)

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
            <span style={S.label}>BACKEND URL (HOST)</span>
            <div style={{ fontSize: 9, color: bp.muted, letterSpacing: 1, marginBottom: 10, lineHeight: 1.45 }}>
              Deployed app loads this from Butterbase automatically. Paste tunnel URL here if needed.
            </div>
            {apiStatus && (
              <div style={{ fontSize: 9, color: '#86efac', letterSpacing: 1, marginBottom: 10, wordBreak: 'break-all' }}>
                {apiStatus}
              </div>
            )}
            <form onSubmit={handleSaveBackend} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <input
                value={backendUrl}
                onChange={e => setBackendUrl(e.target.value)}
                placeholder="https://your-tunnel.loca.lt"
                style={{ ...S.input, flex: 1, fontSize: 10 }}
              />
              <button type="submit" style={{ ...S.btn(false), width: 'auto', padding: '10px 12px', whiteSpace: 'nowrap' }}>
                SET
              </button>
            </form>
          </div>

          <div style={S.panel}>
            <span style={S.label}>NEW SESSION</span>
            {billingConfigured() && (
              <div style={{ fontSize: 9, color: bp.muted, letterSpacing: 1, marginBottom: 12, lineHeight: 1.5 }}>
                {unlocked
                  ? 'Team Pass active — create a hivemind for your crew.'
                  : 'Unlock via Butterbase Payments (Stripe Checkout) — free Team Pass.'}
              </div>
            )}
            {payErr && <div style={{ fontSize: 10, color: '#fca5a5', marginBottom: 10, letterSpacing: 1 }}>{payErr}</div>}
            {!authReady && butterbaseConfigured ? (
              <button disabled style={S.btn(true)}>CHECKING SESSION...</button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => handleCreate({ bypassBilling: true })}
                  disabled={loading}
                  style={S.btn(true)}
                >
                  {loading ? 'CREATING...' : unlocked ? 'CREATE HIVEMIND' : 'ENTER SERVICE'}
                </button>
                {billingConfigured() && authUser && passChecked && !unlocked && (
                  <button onClick={handleUnlock} disabled={actionLoading} style={S.btn(false)}>
                    {loading ? 'REDIRECTING...' : 'UNLOCK TEAM PASS — FREE'}
                  </button>
                )}
                {billingConfigured() && !unlocked && (
                  <div style={{ fontSize: 9, color: bp.muted, letterSpacing: 1, lineHeight: 1.45, textAlign: 'center' }}>
                    Team Pass checkout is optional for now — enter service directly while Stripe is being connected.
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={S.panel}>
            <span style={S.label}>JOIN EXISTING</span>
            <div style={{ fontSize: 9, color: bp.muted, letterSpacing: 1, marginBottom: 10 }}>
              Teammates join free with the shared link.
            </div>
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
