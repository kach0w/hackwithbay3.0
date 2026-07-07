import React, { useState, useCallback, useEffect } from 'react'
import Landing from './components/Landing'
import Onboarding from './components/Onboarding'
import GraphCanvas from './components/GraphCanvas'
import EventInput from './components/EventInput'
import AuthGate from './components/AuthGate'
import { fetchGraph } from './lib/api'
import { useRealtime } from './hooks/useRealtime'
import { butterbase, butterbaseConfigured } from './lib/butterbase'

const BP_HEADER = {
  background: '#0d4f8c',
  borderBottom: '2px solid rgba(255,255,255,0.3)',
  padding: '10px 20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontFamily: "'Courier New', monospace",
}

export default function App() {
  const [sessionId, setSessionId] = useState(null)
  const [shareUrl, setShareUrl] = useState(null)
  const [author, setAuthor] = useState(null)
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  const [highlightIds, setHighlightIds] = useState([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const s = params.get('s')
    if (s) setSessionId(s)
  }, [])

  const loadGraph = useCallback(async () => {
    if (!sessionId) return
    const data = await fetchGraph(sessionId)
    setGraph(data)
  }, [sessionId])

  useEffect(() => { loadGraph() }, [loadGraph])
  useRealtime(loadGraph)

  function handleSession(id, url) {
    setSessionId(id)
    setShareUrl(url)
    if (url) window.history.replaceState({}, '', `?s=${id}`)
  }

  function handleJoined(name) {
    setAuthor(name)
    loadGraph()
  }

  function handleResult(result) {
    loadGraph()
    if (result.affected?.length > 0) {
      const ids = result.affected.flatMap(a => [a.notify, ...a.affected])
      setHighlightIds(ids)
      setTimeout(() => setHighlightIds([]), 4000)
    }
  }

  if (!sessionId) return <Landing onSession={handleSession} />
  if (!author) return <Onboarding sessionId={sessionId} shareUrl={shareUrl} onJoined={handleJoined} />

  return (
    <AuthGate>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1464b4', color: '#fff' }}>
        <header style={BP_HEADER}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 4, color: '#fff' }}>HIVEMIND</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 3 }}>
              SESSION {sessionId}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, alignItems: 'center' }}>
            <span>NODES: {graph.nodes.length}</span>
            <span>EDGES: {graph.edges.length}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>{author?.toUpperCase()}</span>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}?s=${sessionId}`)}
              style={{
                background: 'transparent', color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.3)', fontFamily: "'Courier New', monospace",
                fontSize: 10, letterSpacing: 2, padding: '4px 12px', cursor: 'pointer'
              }}
            >
              COPY LINK
            </button>
            {butterbaseConfigured && butterbase && (
              <button
                onClick={() => butterbase.auth.signOut()}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
                  color: 'rgba(255,255,255,0.7)', fontFamily: "'Courier New', monospace",
                  fontSize: 10, letterSpacing: 2, padding: '4px 12px', cursor: 'pointer'
                }}
              >
                SIGN OUT
              </button>
            )}
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <GraphCanvas graph={graph} highlightIds={highlightIds} />
        </div>

        <EventInput sessionId={sessionId} author={author} onResult={handleResult} />
      </div>
    </AuthGate>
  )
}
