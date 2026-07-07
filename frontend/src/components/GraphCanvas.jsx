import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

const COLORS = {
  Person:    { stroke: '#ffffff',  fill: 'rgba(255,255,255,0.10)' },
  Skill:     { stroke: '#7dd3fc', fill: 'rgba(125,211,252,0.08)' },
  Domain:    { stroke: '#86efac', fill: 'rgba(134,239,172,0.08)' },
  Overlap:   { stroke: '#fde68a', fill: 'rgba(253,230,138,0.12)' },
  Component: { stroke: '#c4b5fd', fill: 'rgba(196,181,253,0.08)' },
  Decision:  { stroke: '#fdba74', fill: 'rgba(253,186,116,0.08)' },
}

const DEPRECATED_COLOR = 'rgba(255,255,255,0.2)'

const NODE_SIZE = {
  Person:    { w: 164, h: 48 },
  Overlap:   { w: 184, h: 48 },
  Decision:  { w: 184, h: 44 },
  Skill:     { w: 134, h: 36 },
  Domain:    { w: 144, h: 36 },
  Component: { w: 154, h: 42 },
}

function getSize(type) { return NODE_SIZE[type] || { w: 130, h: 36 } }
function nid(x) { return x?.id ?? x }

// Deterministic layout — computes fixed (x,y) per node type, no physics needed
function computePositions(nodes, edges, W, H, mode) {
  const pos = {}
  if (!W || !H || !nodes.length) return pos

  const byType = t => nodes.filter(n => n.type === t)
  const persons    = byType('Person')
  const overlaps   = byType('Overlap')
  const skills     = byType('Skill')
  const domains    = byType('Domain')
  const components = byType('Component')
  const decisions  = byType('Decision')
  const pad = 110

  if (mode === 'brainstorm') {
    const usableW = W - pad * 2

    // Row 1: Persons evenly across top
    persons.forEach((p, i) => {
      pos[p.id] = {
        x: persons.length === 1 ? W / 2 : pad + (usableW / (persons.length - 1)) * i,
        y: Math.round(H * 0.16)
      }
    })

    // Build owner map: skill/domain id → person id
    const owner = {}
    for (const e of edges) {
      const sid = nid(e.source), tid = nid(e.target)
      const sn = nodes.find(n => n.id === sid)
      const tn = nodes.find(n => n.id === tid)
      if (!sn || !tn) continue
      if (sn.type === 'Person' && (tn.type === 'Skill' || tn.type === 'Domain')) owner[tn.id] = sn.id
      if (tn.type === 'Person' && (sn.type === 'Skill' || sn.type === 'Domain')) owner[sn.id] = tn.id
    }

    // Row 2: Skills — 3 columns under their person, 62px row gap
    const skillIdx = {}
    for (const s of skills) {
      const pid  = owner[s.id]
      const pPos = pos[pid]
      const idx  = skillIdx[pid ?? '_'] ?? 0
      skillIdx[pid ?? '_'] = idx + 1
      const col  = (idx % 3) - 1
      pos[s.id] = {
        x: pPos ? Math.round(pPos.x + col * 148) : Math.round(pad + ((skills.indexOf(s) + 1) * (usableW / (skills.length + 1)))),
        y: Math.round(H * 0.40 + Math.floor(idx / 3) * 62)
      }
    }

    // Row 3: Domains — same structure below skills
    const domIdx = {}
    for (const d of domains) {
      const pid  = owner[d.id]
      const pPos = pos[pid]
      const idx  = domIdx[pid ?? '_'] ?? 0
      domIdx[pid ?? '_'] = idx + 1
      const col  = (idx % 3) - 1
      pos[d.id] = {
        x: pPos ? Math.round(pPos.x + col * 158) : Math.round(pad + ((domains.indexOf(d) + 1) * (usableW / (domains.length + 1)))),
        y: Math.round(H * 0.64 + Math.floor(idx / 3) * 58)
      }
    }

    // Row 4: Overlaps — centered between their connected persons
    for (const o of overlaps) {
      const personIds = edges
        .filter(e => nid(e.source) === o.id || nid(e.target) === o.id)
        .map(e => nid(e.source) === o.id ? nid(e.target) : nid(e.source))
        .filter(id => persons.find(p => p.id === id))
      const pPoses = personIds.map(id => pos[id]).filter(Boolean)
      pos[o.id] = {
        x: Math.round(pPoses.length ? pPoses.reduce((s, p) => s + p.x, 0) / pPoses.length : W / 2),
        y: Math.round(H * 0.86)
      }
    }
  } else {
    // Project: persons left | components center | decisions grid right
    persons.forEach((p, i) => {
      pos[p.id] = { x: pad, y: Math.round(H * 0.18 + i * 92) }
    })
    components.forEach((c, i) => {
      pos[c.id] = { x: pad + 220, y: Math.round(H * 0.14 + i * 92) }
    })
    decisions.forEach((d, i) => {
      pos[d.id] = {
        x: pad + 450 + (i % 3) * 206,
        y: Math.round(H * 0.14 + Math.floor(i / 3) * 82)
      }
    })
  }

  return pos
}

export default function GraphCanvas({ graph, highlightIds = [], mode = 'brainstorm', onNodeClick }) {
  const bgRef        = useRef()
  const containerRef = useRef()
  const [dims, setDims] = useState({ w: 900, h: 600 })

  // Track container dimensions for layout computation
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 10 && height > 10) setDims({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Blueprint grid background
  useEffect(() => {
    const canvas = bgRef.current
    if (!canvas) return
    const draw = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#1464b4'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const step = 28
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 0.5
      for (let x = 0; x < canvas.width;  x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke() }
      for (let y = 0; y < canvas.height; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);  ctx.stroke() }
    }
    draw()
    window.addEventListener('resize', draw)
    return () => window.removeEventListener('resize', draw)
  }, [])

  // Precompute static positions — nodes get fx/fy so simulation does nothing
  const graphData = useMemo(() => {
    const { w, h } = dims
    const nodes = graph.nodes || []
    const edges = graph.edges || []
    const pos   = computePositions(nodes, edges, w, h, mode)
    return {
      nodes: nodes.map(n => {
        const p = pos[n.id]
        return { ...n, x: p?.x ?? w / 2, y: p?.y ?? h / 2, fx: p?.x ?? w / 2, fy: p?.y ?? h / 2 }
      }),
      links: edges.map(e => ({ ...e }))
    }
  }, [graph, dims, mode])

  const nodeCanvasObject = useCallback((node, ctx, gs) => {
    const isDeprecated  = node.deprecated
    const isHighlighted = highlightIds.includes(node.id)
    const label  = (node.label || node.id || '').toUpperCase()
    const type   = node.type || 'Component'
    const colors = COLORS[type] || COLORS.Component
    const { w, h } = getSize(type)
    const sw = w / gs, sh = h / gs
    const x  = node.x - sw / 2, y = node.y - sh / 2
    const lw = Math.max(0.5, 1.2 / gs)
    const fs = Math.max(7, 11 / gs)
    const sfs = Math.max(5, 7.5 / gs)

    // Fill + border
    ctx.fillStyle   = isDeprecated ? 'rgba(255,255,255,0.02)' : colors.fill
    ctx.fillRect(x, y, sw, sh)
    ctx.strokeStyle = isDeprecated ? DEPRECATED_COLOR : isHighlighted ? '#ffe066' : colors.stroke
    ctx.lineWidth   = isHighlighted ? lw * 2.5 : lw
    ctx.setLineDash(isDeprecated ? [3 / gs, 3 / gs] : [])
    ctx.strokeRect(x, y, sw, sh)
    ctx.setLineDash([])

    // Corner tick marks
    if (!isDeprecated) {
      const t = 5 / gs
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'
      ctx.lineWidth   = lw * 0.7
      ;[[x, y], [x + sw, y], [x, y + sh], [x + sw, y + sh]].forEach(([cx, cy]) => {
        ctx.beginPath(); ctx.moveTo(cx - t, cy); ctx.lineTo(cx + t, cy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx, cy - t); ctx.lineTo(cx, cy + t); ctx.stroke()
      })
    }

    // Type tag top-left
    ctx.font         = `${sfs}px 'Courier New', monospace`
    ctx.fillStyle    = 'rgba(255,255,255,0.32)'
    ctx.textAlign    = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(type.toUpperCase(), x + 4 / gs, y + 3 / gs)

    // Main label centered
    ctx.font         = `bold ${fs}px 'Courier New', monospace`
    ctx.fillStyle    = isDeprecated ? DEPRECATED_COLOR : isHighlighted ? '#ffe066' : colors.stroke
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    const maxChars   = Math.floor(sw / (fs * 0.58))
    const display    = label.length > maxChars ? label.slice(0, maxChars - 2) + '..' : label
    ctx.fillText(display, node.x, node.y + 3 / gs)

    if (isDeprecated) {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth   = lw
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sw, y + sh); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + sw, y); ctx.lineTo(x, y + sh); ctx.stroke()
    }

    if (isHighlighted) {
      ctx.strokeStyle = '#ffe066'
      ctx.lineWidth   = lw
      ctx.setLineDash([4 / gs, 4 / gs])
      ctx.strokeRect(x - 5 / gs, y - 5 / gs, sw + 10 / gs, sh + 10 / gs)
      ctx.setLineDash([])
    }

    node.__w = sw; node.__h = sh
  }, [highlightIds])

  // Orthogonal L-path edges
  const linkCanvasObject = useCallback((link, ctx) => {
    const src = link.source, tgt = link.target
    if (!src?.x || !tgt?.x) return

    const isDeprecated = link.deprecated
    const isSupersedes = link.type === 'SUPERSEDES'
    const isOverlap    = link.type === 'OVERLAPS_WITH'

    ctx.strokeStyle = isDeprecated  ? 'rgba(255,255,255,0.12)'
      : isSupersedes ? 'rgba(255,160,80,0.85)'
      : isOverlap    ? 'rgba(253,230,138,0.75)'
      : 'rgba(255,255,255,0.42)'
    ctx.lineWidth = isOverlap ? 1.5 : 1
    ctx.setLineDash(isDeprecated ? [5, 5] : isSupersedes ? [4, 4] : [])

    const midX = (src.x + tgt.x) / 2
    ctx.beginPath()
    ctx.moveTo(src.x, src.y)
    ctx.lineTo(midX, src.y)
    ctx.lineTo(midX, tgt.y)
    ctx.lineTo(tgt.x, tgt.y)
    ctx.stroke()
    ctx.setLineDash([])

    const dy    = tgt.y - src.y
    const angle = dy === 0 ? Math.atan2(0, tgt.x - src.x) : Math.atan2(dy, 0)
    const as    = 5
    ctx.fillStyle = ctx.strokeStyle
    ctx.beginPath()
    ctx.moveTo(tgt.x, tgt.y)
    ctx.lineTo(tgt.x - as * Math.cos(angle - 0.4), tgt.y - as * Math.sin(angle - 0.4))
    ctx.lineTo(tgt.x - as * Math.cos(angle + 0.4), tgt.y - as * Math.sin(angle + 0.4))
    ctx.closePath()
    ctx.fill()
  }, [])

  const nodePointerAreaPaint = useCallback((node, color, ctx) => {
    ctx.fillStyle = color
    ctx.fillRect(node.x - (node.__w || 130) / 2, node.y - (node.__h || 36) / 2, node.__w || 130, node.__h || 36)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={bgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <ForceGraph2D
        graphData={graphData}
        width={dims.w}
        height={dims.h}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        nodePointerAreaPaint={nodePointerAreaPaint}
        linkCanvasObject={linkCanvasObject}
        linkCanvasObjectMode={() => 'replace'}
        backgroundColor="transparent"
        linkLabel={l => l.type}
        onNodeClick={onNodeClick}
        enableNodeDrag={false}
        enableZoomInteraction={true}
        d3AlphaDecay={1}
        cooldownTicks={0}
      />
      <Legend mode={mode} />
    </div>
  )
}

function Legend({ mode }) {
  const items = mode === 'brainstorm'
    ? [['PERSON', '#ffffff'], ['SKILL', '#7dd3fc'], ['DOMAIN', '#86efac'], ['OVERLAP', '#fde68a']]
    : [['PERSON', '#ffffff'], ['COMPONENT', '#c4b5fd'], ['DECISION', '#fdba74']]
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: 20,
      border: '1px solid rgba(255,255,255,0.25)', padding: '12px 16px',
      fontFamily: "'Courier New', monospace",
      background: 'rgba(13,79,140,0.92)', backdropFilter: 'blur(6px)'
    }}>
      <div style={{ fontSize: 10, color: '#fff', letterSpacing: 3, marginBottom: 8 }}>LEGEND</div>
      {items.map(([label, color]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 24, height: 13, border: `1.5px solid ${color}`, flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>{label}</span>
        </div>
      ))}
    </div>
  )
}
