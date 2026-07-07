import React, { useState, useCallback, useEffect } from 'react'
import GraphCanvas from './GraphCanvas'
import EventInput from './EventInput'
import { fetchProjectGraph } from '../lib/api'
import { useRealtime } from '../hooks/useRealtime'

export default function ProjectView({ sessionId, author }) {
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  const [highlightIds, setHighlightIds] = useState([])

  const load = useCallback(async () => {
    const data = await fetchProjectGraph(sessionId)
    setGraph(data)
  }, [sessionId])

  useEffect(() => { load() }, [load])
  useRealtime(load)

  function handleResult(result) {
    load()
    if (result.affected?.length > 0) {
      const ids = result.affected.flatMap(a => [a.notify, ...a.affected])
      setHighlightIds(ids)
      setTimeout(() => setHighlightIds([]), 4000)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <GraphCanvas graph={graph} highlightIds={highlightIds} mode="project" />
      </div>
      <EventInput sessionId={sessionId} author={author} onResult={handleResult} />
    </div>
  )
}
