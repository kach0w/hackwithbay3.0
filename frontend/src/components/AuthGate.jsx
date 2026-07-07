import React, { useEffect, useState } from 'react'
import { butterbase, butterbaseConfigured } from '../lib/butterbase'

const panel = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0f172a',
  color: '#f9fafb',
  fontFamily: 'sans-serif',
  padding: 24
}

const card = {
  width: '100%',
  maxWidth: 360,
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 12,
  padding: 24
}

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(butterbaseConfigured)
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!butterbaseConfigured || !butterbase) {
      setLoading(false)
      return
    }

    butterbase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null)
      setLoading(false)
    })

    const { unsubscribe } = butterbase.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return unsubscribe
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const action = mode === 'signin'
      ? butterbase.auth.signIn({ email, password })
      : butterbase.auth.signUp({ email, password })

    const { error: authError } = await action
    if (authError) setError(authError.message)
  }

  if (!butterbaseConfigured) {
    return children
  }

  if (loading) {
    return <div style={panel}>Loading session…</div>
  }

  if (!user) {
    return (
      <div style={panel}>
        <form style={card} onSubmit={handleSubmit}>
          <h2 style={{ marginTop: 0 }}>◈ Hivemind</h2>
          <p style={{ color: '#94a3b8', marginBottom: 20 }}>
            Sign in with Butterbase to sync your project brain.
          </p>
          <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 12, padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f9fafb' }}
          />
          <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', marginBottom: 16, padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f9fafb' }}
          />
          {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}
          <button type="submit" style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            style={{ width: '100%', marginTop: 10, padding: 8, border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}
          >
            {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    )
  }

  return children
}
