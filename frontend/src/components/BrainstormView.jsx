import React, { useState, useCallback, useEffect, Suspense } from 'react'
import { fetchBrainstormGraph, recomputeOverlaps } from '../lib/api'
import { useRealtime } from '../hooks/useRealtime'

const GraphCanvas = React.lazy(() => import('./GraphCanvas'))

const bp = { font: "'Courier New', monospace", muted: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.3)' }

function Section({ label, color, children }) {
  return (
    <div style={{ marginBottom: 12, paddingTop: 4 }}>
      <div style={{ fontSize: 9, color: bp.muted, letterSpacing: 2, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 10, color, lineHeight: 1.65 }}>{children}</div>
    </div>
  )
}

function Tags({ label, items, color }) {
  const list = Array.isArray(items) ? items : []
  if (!list.length) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 9, color: bp.muted, letterSpacing: 2, marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {list.map(item => (
          <span key={item} style={{ fontSize: 9, color, border: `1px solid ${color}`, padding: '2px 6px', letterSpacing: 0.5, opacity: 0.85 }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function BrainstormView({ sessionId, member }) {
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  const [selected, setSelected] = useState(null)
  const [computing, setComputing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await fetchBrainstormGraph(sessionId)
      setGraph({
        nodes: Array.isArray(data?.nodes) ? data.nodes : [],
        edges: Array.isArray(data?.edges) ? data.edges : []
      })
      setError('')
    } catch (err) {
      setError(err.message || 'Could not load brainstorm graph')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { load() }, [load])
  useRealtime(load)

  async function handleRecompute() {
    setComputing(true)
    try {
      await recomputeOverlaps(sessionId)
      await load()
    } catch (err) {
      setError(err.message || 'Overlap recompute failed')
    } finally {
      setComputing(false)
    }
  }

  const nodes = graph.nodes || []
  const people  = nodes.filter(n => n.type === 'Person')
  const overlaps = nodes.filter(n => n.type === 'Overlap')

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0, background: '#1464b4' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0, minHeight: 0 }}>
        {error && (
          <div style={{
            position: 'absolute', top: 16, left: 16, right: 16, zIndex: 2,
            background: 'rgba(127,29,29,0.9)', border: '1px solid #fca5a5',
            color: '#fecaca', padding: '10px 14px', fontSize: 11, letterSpacing: 1
          }}>
            {error}
          </div>
        )}
        <Suspense fallback={
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.5)', fontFamily: bp.font, fontSize: 11, letterSpacing: 3
          }}>
            {loading ? 'LOADING GRAPH...' : 'LOADING CANVAS...'}
          </div>
        }>
          <GraphCanvas graph={graph} mode="brainstorm" onNodeClick={setSelected} />
        </Suspense>
      </div>

      {/* Side panel */}
      <div style={{
        width: 280, background: '#0d4f8c', borderLeft: '1px solid rgba(255,255,255,0.15)',
        display: 'flex', flexDirection: 'column', fontFamily: bp.font, overflow: 'hidden'
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 3, marginBottom: 10 }}>TEAM</div>
          {people.length === 0
            ? <div style={{ fontSize: 10, color: bp.muted }}>NO MEMBERS YET</div>
            : people.map(p => (
              <div key={p.id} style={{ marginBottom: 10, padding: 8, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }} onClick={() => setSelected(p)}>
                <div style={{ fontSize: 11, color: '#fff', letterSpacing: 1 }}>{p.label}</div>
                {p.archetype && <div style={{ fontSize: 9, color: bp.muted, letterSpacing: 1, marginTop: 2 }}>{p.archetype.toUpperCase()}</div>}
                {p.github && (!p.skills || p.skills.length === 0) && (
                  <div style={{ fontSize: 8, color: '#fde68a', letterSpacing: 1, marginTop: 4 }}>GITHUB ENRICHING...</div>
                )}
              </div>
            ))
          }
        </div>

        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 3, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>OVERLAPS ({overlaps.length})</span>
            <button onClick={handleRecompute} disabled={computing} style={{
              background: 'transparent', color: computing ? bp.muted : '#ffe066',
              border: '1px solid rgba(255,220,80,0.4)', fontFamily: bp.font,
              fontSize: 9, letterSpacing: 1, padding: '2px 8px', cursor: 'pointer'
            }}>
              {computing ? '...' : 'REFRESH'}
            </button>
          </div>
          {overlaps.length === 0
            ? <div style={{ fontSize: 10, color: bp.muted, lineHeight: 1.5 }}>
                {people.length < 2
                  ? 'SHARE LINK — OVERLAPS APPEAR WHEN 2+ PEOPLE JOIN'
                  : people.some(p => p.github && (!p.skills || p.skills.length === 0))
                    ? 'INGESTING GITHUB — OVERLAPS AUTO-COMPUTE WHEN READY'
                    : 'COMPUTING OVERLAPS FROM READMES...'}
              </div>
            : overlaps.map(o => (
              <div key={o.id} style={{ marginBottom: 8, padding: 8, border: '1px solid rgba(253,230,138,0.2)', cursor: 'pointer' }} onClick={() => setSelected(o)}>
                <div style={{ fontSize: 11, color: '#fde68a', letterSpacing: 0.5 }}>{o.label}</div>
                {o.intersection && <div style={{ fontSize: 9, color: bp.muted, marginTop: 3, lineHeight: 1.5 }}>{o.intersection}</div>}
              </div>
            ))
          }
        </div>

        {/* Selected node detail */}
        {selected && (
          <div style={{ padding: '14px 16px', flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 3, marginBottom: 10 }}>PROFILE</div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, marginBottom: 4 }}>{selected.label}</div>
            {selected.archetype && <div style={{ fontSize: 9, color: '#7dd3fc', letterSpacing: 2, marginBottom: 10 }}>{selected.archetype?.toUpperCase()}</div>}

            {selected.synthesis && <Section label="WHO THEY ARE" color="rgba(255,255,255,0.75)">{selected.synthesis}</Section>}
            {selected.human_dimension && <Section label="WHAT DRIVES THEM" color="#86efac">{selected.human_dimension}</Section>}
            {selected.technical_depth && <Section label="TECHNICAL DEPTH" color="#7dd3fc">{selected.technical_depth}</Section>}
            {selected.collaboration_style && <Section label="COLLABORATION" color="rgba(255,255,255,0.5)">{selected.collaboration_style}</Section>}

            {selected.strongest_in?.length > 0 && <Tags label="STRONGEST IN" items={selected.strongest_in} color="#7dd3fc" />}
            {selected.curious_about?.length > 0 && <Tags label="CURIOUS ABOUT" items={selected.curious_about} color="#86efac" />}
            {selected.conversation_topics?.length > 0 && <Tags label="GEEKS OUT ON" items={selected.conversation_topics} color="#fde68a" />}
            {selected.blind_spots?.length > 0 && <Tags label="BLIND SPOTS" items={selected.blind_spots} color="rgba(255,100,100,0.7)" />}

            {selected.build_direction && <Section label="BUILD TOGETHER" color="#fde68a">{selected.build_direction}</Section>}
            {selected.intersection && <Section label="OVERLAP" color="#fde68a">{selected.intersection}</Section>}
          </div>
        )}
      </div>
    </div>
  )
}
