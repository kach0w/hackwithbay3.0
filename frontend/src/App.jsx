import React, { useState, useCallback, useEffect } from 'react'
import GraphCanvas from './components/GraphCanvas'
import EventInput from './components/EventInput'
import { fetchGraph } from './lib/api'
import { useRealtime } from './hooks/useRealtime'

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
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  const [highlightIds, setHighlightIds] = useState([])

  const loadGraph = useCallback(async () => {
    const data = await fetchGraph()
    setGraph(data)
  }, [])

  useEffect(() => { loadGraph() }, [loadGraph])
  useRealtime(loadGraph)

  function handleResult(result) {
    loadGraph()
    if (result.affected?.length > 0) {
      const ids = result.affected.flatMap(a => [a.notify, ...a.affected])
      setHighlightIds(ids)
      setTimeout(() => setHighlightIds([]), 4000)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1464b4', color: '#fff' }}>
      <header style={BP_HEADER}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 4, color: '#fff' }}>
            HIVEMIND
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 3 }}>
            PROJECT MEMORY SYSTEM
          </span>
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 2 }}>
          <span>NODES: {graph.nodes.length}</span>
          <span>EDGES: {graph.edges.length}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>REV 1.0</span>
        </div>
      </header>

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <GraphCanvas graph={graph} highlightIds={highlightIds} />
      </div>

      <EventInput onResult={handleResult} />
    </div>
  )
}
