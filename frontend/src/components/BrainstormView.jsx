import React, { useState, useCallback, useEffect } from 'react'
import GraphCanvas from './GraphCanvas'
import { fetchBrainstormGraph, recomputeOverlaps } from '../lib/api'
import { useRealtime } from '../hooks/useRealtime'

const bp = { font: "'Courier New', monospace", muted: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.3)' }

function Section({ label, color, children }) {
  return (
    <div style={{ marginBottom: 12, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
      <div style={{ fontSize: 9, color: bp.muted, letterSpacing: 2, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 10, color, lineHeight: 1.65 }}>{children}</div>
    </div>
  )
}

function Tags({ label, items, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 9, color: bp.muted, letterSpacing: 2, marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {items.map(item => (
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

  const load = useCallback(async () => {
    const data = await fetchBrainstormGraph(sessionId)
    setGraph(data)
  }, [sessionId])

  useEffect(() => { load() }, [load])
  useRealtime(load)

  async function handleRecompute() {
    setComputing(true)
    await recomputeOverlaps(sessionId)
    await load()
    setComputing(false)
  }

  const people  = graph.nodes.filter(n => n.type === 'Person')
  const overlaps = graph.nodes.filter(n => n.type === 'Overlap')

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <GraphCanvas graph={graph} mode="brainstorm" onNodeClick={setSelected} />
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
              {computing ? '...' : 'RECOMPUTE'}
            </button>
          </div>
          {overlaps.length === 0
            ? <div style={{ fontSize: 10, color: bp.muted }}>JOIN 2+ PEOPLE TO FIND OVERLAPS</div>
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
