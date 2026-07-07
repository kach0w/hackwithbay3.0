import React, { useState, useCallback, useEffect, Suspense } from 'react'
import EventInput from './EventInput'
import { fetchProjectGraph } from '../lib/api'
import { useRealtime } from '../hooks/useRealtime'

const GraphCanvas = React.lazy(() => import('./GraphCanvas'))

export default function ProjectView({ sessionId, member }) {
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  const [highlightIds, setHighlightIds] = useState([])

  const load = useCallback(async () => {
    try {
      const data = await fetchProjectGraph(sessionId)
      setGraph({
        nodes: Array.isArray(data?.nodes) ? data.nodes : [],
        edges: Array.isArray(data?.edges) ? data.edges : []
      })
    } catch (err) {
      console.warn('[project] load failed:', err.message)
      setGraph({ nodes: [], edges: [] })
    }
  }, [sessionId])

  useEffect(() => { load() }, [load])
  useRealtime(load)

  function handleResult(result) {
    load()
    if (result.affected?.length > 0) {
      const ids = result.affected.flatMap(a => [a.notifyId, ...(a.affectedIds || [])].filter(Boolean))
      setHighlightIds(ids)
      setTimeout(() => setHighlightIds([]), 4000)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0, background: '#1464b4' }}>
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <Suspense fallback={
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.5)', fontFamily: "'Courier New', monospace",
            fontSize: 11, letterSpacing: 3
          }}>
            LOADING GRAPH...
          </div>
        }>
          <GraphCanvas graph={graph} highlightIds={highlightIds} mode="project" />
        </Suspense>
      </div>
      <EventInput sessionId={sessionId} member={member} onResult={handleResult} />
    </div>
  )
}
