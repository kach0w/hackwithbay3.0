import React, { useState, useCallback, useEffect } from 'react'
import GraphCanvas from './components/GraphCanvas'
import EventInput from './components/EventInput'
import { fetchGraph } from './lib/api'
import { useRealtime } from './hooks/useRealtime'

const LEGEND = [
  { type: 'Person',    color: '#60a5fa' },
  { type: 'Component', color: '#34d399' },
  { type: 'Decision',  color: '#fbbf24' }
]

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: '#f9fafb', fontFamily: 'sans-serif' }}>
      <header style={{ padding: '12px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>
          ◈ Hivemind
          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 12, fontWeight: 400 }}>
            shared project memory
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
          {LEGEND.map(l => (
            <span key={l.type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
              {l.type}
            </span>
          ))}
          <span>{graph.nodes.length} nodes · {graph.edges.length} edges</span>
        </div>
      </header>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <GraphCanvas graph={graph} highlightIds={highlightIds} />
      </div>

      <EventInput onResult={handleResult} />
    </div>
  )
}
