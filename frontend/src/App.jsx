import React, { useState, useEffect } from 'react'
import Landing from './components/Landing'
import Onboarding from './components/Onboarding'
import ModeSelect from './components/ModeSelect'
import BrainstormView from './components/BrainstormView'
import ProjectView from './components/ProjectView'
import AuthGate from './components/AuthGate'
import { butterbase, butterbaseConfigured } from './lib/butterbase'

const bp = {
  header: {
    background: '#0d4f8c',
    borderBottom: '2px solid rgba(255,255,255,0.25)',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    fontFamily: "'Courier New', monospace",
    height: 48,
  }
}

export default function App() {
  const [sessionId, setSessionId] = useState(null)
  const [shareUrl,  setShareUrl]  = useState(null)
  const [author,    setAuthor]    = useState(null)
  const [mode,      setMode]      = useState(null) // null | 'brainstorm' | 'project'

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('s')
    if (s) setSessionId(s)
  }, [])

  function handleSession(id, url) {
    setSessionId(id)
    setShareUrl(url)
    if (url) window.history.replaceState({}, '', `?s=${id}`)
  }

  function handleJoined(name) {
    setAuthor(name)
  }

  if (!sessionId)          return <Landing    onSession={handleSession} />
  if (!author)             return <Onboarding sessionId={sessionId} shareUrl={shareUrl} onJoined={handleJoined} />
  if (!mode)               return <ModeSelect onSelect={setMode} />

  return (
    <AuthGate>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1464b4', color: '#fff' }}>
        <header style={bp.header}>
          {/* Left: title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 4 }}>HIVEMIND</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 2 }}>
              {sessionId}
            </span>
          </div>

          {/* Center: tabs */}
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            {[['brainstorm', 'BRAINSTORM'], ['project', 'PROJECT']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                style={{
                  background: 'transparent',
                  color: mode === key ? '#fff' : 'rgba(255,255,255,0.4)',
                  border: 'none',
                  borderBottom: mode === key ? '2px solid #fff' : '2px solid transparent',
                  fontFamily: "'Courier New', monospace",
                  fontSize: 11, letterSpacing: 3,
                  padding: '0 28px', cursor: 'pointer',
                  marginBottom: mode === key ? '-2px' : 0
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right: meta */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 1 }}>
            <span>{author?.toUpperCase()}</span>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}?s=${sessionId}`)}
              style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.25)', fontFamily: "'Courier New', monospace", fontSize: 9, letterSpacing: 2, padding: '3px 10px', cursor: 'pointer' }}
            >
              COPY LINK
            </button>
            {butterbaseConfigured && butterbase && (
              <button
                onClick={() => butterbase.auth.signOut()}
                style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.25)', fontFamily: "'Courier New', monospace", fontSize: 9, letterSpacing: 2, padding: '3px 10px', cursor: 'pointer' }}
              >
                SIGN OUT
              </button>
            )}
          </div>
        </header>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {mode === 'brainstorm'
            ? <BrainstormView sessionId={sessionId} author={author} />
            : <ProjectView    sessionId={sessionId} author={author} />
          }
        </div>
      </div>
    </AuthGate>
  )
}
