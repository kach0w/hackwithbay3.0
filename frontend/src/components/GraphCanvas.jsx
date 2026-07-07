import React, { useRef, useCallback, useEffect } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

const COLORS = {
  Person:    { stroke: '#ffffff', fill: 'rgba(255,255,255,0.10)' },
  Skill:     { stroke: '#7dd3fc', fill: 'rgba(125,211,252,0.08)' },
  Domain:    { stroke: '#86efac', fill: 'rgba(134,239,172,0.08)' },
  Overlap:   { stroke: '#fde68a', fill: 'rgba(253,230,138,0.12)' },
  Component: { stroke: '#c4b5fd', fill: 'rgba(196,181,253,0.08)' },
  Decision:  { stroke: '#fdba74', fill: 'rgba(253,186,116,0.08)' },
}

const DEPRECATED_COLOR = 'rgba(255,255,255,0.2)'

const NODE_SIZE = {
  Person:    { w: 140, h: 40 },
  Overlap:   { w: 160, h: 40 },
  Decision:  { w: 160, h: 36 },
  Skill:     { w: 110, h: 30 },
  Domain:    { w: 120, h: 30 },
  Component: { w: 130, h: 32 },
}

function getSize(type) { return NODE_SIZE[type] || { w: 110, h: 30 } }

export default function GraphCanvas({ graph, highlightIds = [], mode = 'brainstorm' }) {
  const fgRef = useRef()
  const bgRef = useRef()
  const frozenRef = useRef(false)

  // Draw grid background
  useEffect(() => {
    const canvas = bgRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#1464b4'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const step = 28
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 0.5
      for (let x = 0; x < canvas.width;  x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke() }
      for (let y = 0; y < canvas.height; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke() }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Re-heat simulation when graph data changes, then freeze on settle
  useEffect(() => {
    frozenRef.current = false
    if (fgRef.current) {
      fgRef.current.d3ReheatSimulation()
    }
  }, [graph])

  // Configure forces for wide, stable layout
  const handleEngineInit = useCallback(() => {
    const fg = fgRef.current
    if (!fg) return
    fg.d3Force('charge')?.strength(-800)
    fg.d3Force('link')?.distance(180).strength(0.3)
    fg.d3Force('collision', null)
    fg.d3Force('x', null)
    fg.d3Force('y', null)
  }, [])

  // Pin all nodes once simulation settles — eliminates drift
  const handleEngineStop = useCallback(() => {
    if (frozenRef.current) return
    frozenRef.current = true
    const fg = fgRef.current
    if (!fg) return
    fg.graphData().nodes.forEach(node => {
      node.fx = node.x
      node.fy = node.y
    })
  }, [])

  const nodeCanvasObject = useCallback((node, ctx, gs) => {
    const isDeprecated  = node.deprecated
    const isHighlighted = highlightIds.includes(node.id)
    const label  = (node.label || node.id || '').toUpperCase()
    const type   = node.type || 'Component'
    const colors = COLORS[type] || COLORS.Component
    const { w, h } = getSize(type)
    const sw = w / gs, sh = h / gs
    const x = node.x - sw / 2, y = node.y - sh / 2
    const lw  = Math.max(0.5, 1.2 / gs)
    const fs  = Math.max(6, 10 / gs)
    const sfs = Math.max(4, 7 / gs)

    // Fill
    ctx.fillStyle = isDeprecated ? 'rgba(255,255,255,0.02)' : colors.fill
    ctx.fillRect(x, y, sw, sh)

    // Border
    ctx.strokeStyle = isDeprecated ? DEPRECATED_COLOR : isHighlighted ? '#ffe066' : colors.stroke
    ctx.lineWidth   = isHighlighted ? lw * 2.5 : lw
    ctx.setLineDash(isDeprecated ? [3 / gs, 3 / gs] : [])
    ctx.strokeRect(x, y, sw, sh)
    ctx.setLineDash([])

    // Corner ticks — blueprint dimension marks
    if (!isDeprecated) {
      const t = 4 / gs
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = lw * 0.6
      ;[[x, y],[x+sw, y],[x, y+sh],[x+sw, y+sh]].forEach(([cx, cy]) => {
        ctx.beginPath(); ctx.moveTo(cx-t, cy); ctx.lineTo(cx+t, cy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx, cy-t); ctx.lineTo(cx, cy+t); ctx.stroke()
      })
    }

    // Type tag (top-left)
    ctx.font = `${sfs}px 'Courier New', monospace`
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(type, x + 3/gs, y + 2/gs)

    // Main label (centered)
    ctx.font = `bold ${fs}px 'Courier New', monospace`
    ctx.fillStyle = isDeprecated ? DEPRECATED_COLOR : isHighlighted ? '#ffe066' : colors.stroke
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const maxChars = Math.floor(sw / (fs * 0.6))
    const displayLabel = label.length > maxChars ? label.slice(0, maxChars - 2) + '..' : label
    ctx.fillText(displayLabel, node.x, node.y + 2/gs)

    // Deprecated X
    if (isDeprecated) {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = lw
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x+sw, y+sh); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x+sw, y); ctx.lineTo(x, y+sh); ctx.stroke()
      if (node.ts) {
        ctx.font = `${sfs}px 'Courier New', monospace`
        ctx.fillStyle = DEPRECATED_COLOR
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(new Date(node.ts).toLocaleTimeString(), node.x, y+sh+2/gs)
      }
    }

    // Highlight ring
    if (isHighlighted) {
      ctx.strokeStyle = '#ffe066'
      ctx.lineWidth = lw
      ctx.setLineDash([4/gs, 4/gs])
      ctx.strokeRect(x-5/gs, y-5/gs, sw+10/gs, sh+10/gs)
      ctx.setLineDash([])
    }

    node.__w = sw; node.__h = sh
  }, [highlightIds])

  // Orthogonal 90-degree edges
  const linkCanvasObject = useCallback((link, ctx) => {
    const src = link.source, tgt = link.target
    if (!src?.x || !tgt?.x) return

    const isDeprecated = link.deprecated
    const isSupersedes = link.type === 'SUPERSEDES'
    const isOverlap    = link.type === 'OVERLAPS_WITH'

    ctx.strokeStyle = isDeprecated   ? 'rgba(255,255,255,0.12)'
      : isSupersedes ? 'rgba(255,160,80,0.8)'
      : isOverlap    ? 'rgba(253,230,138,0.7)'
      : 'rgba(255,255,255,0.4)'
    ctx.lineWidth = isOverlap ? 1.5 : 1
    ctx.setLineDash(isDeprecated ? [5,5] : isSupersedes ? [4,4] : [])

    const midX = (src.x + tgt.x) / 2
    ctx.beginPath()
    ctx.moveTo(src.x, src.y)
    ctx.lineTo(midX, src.y)
    ctx.lineTo(midX, tgt.y)
    ctx.lineTo(tgt.x, tgt.y)
    ctx.stroke()
    ctx.setLineDash([])

    // Arrow
    const dy = tgt.y - src.y
    const angle = dy === 0 ? Math.atan2(0, tgt.x - src.x) : Math.atan2(dy, 0)
    const as = 5
    ctx.fillStyle = ctx.strokeStyle
    ctx.beginPath()
    ctx.moveTo(tgt.x, tgt.y)
    ctx.lineTo(tgt.x - as*Math.cos(angle-0.4), tgt.y - as*Math.sin(angle-0.4))
    ctx.lineTo(tgt.x - as*Math.cos(angle+0.4), tgt.y - as*Math.sin(angle+0.4))
    ctx.closePath()
    ctx.fill()
  }, [])

  const nodePointerAreaPaint = useCallback((node, color, ctx) => {
    ctx.fillStyle = color
    ctx.fillRect(node.x-(node.__w||110)/2, node.y-(node.__h||30)/2, node.__w||110, node.__h||30)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={bgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <ForceGraph2D
        ref={fgRef}
        graphData={{
          nodes: graph.nodes.map(n => ({ ...n })),
          links: graph.edges.map(e => ({ ...e, source: e.source, target: e.target }))
        }}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        nodePointerAreaPaint={nodePointerAreaPaint}
        linkCanvasObject={linkCanvasObject}
        linkCanvasObjectMode={() => 'replace'}
        backgroundColor="transparent"
        linkLabel={l => l.type}
        onEngineStop={handleEngineStop}
        onEngineInit={handleEngineInit}
        d3AlphaDecay={0.04}
        d3VelocityDecay={0.4}
        cooldownTicks={120}
        warmupTicks={0}
      />
      <Legend mode={mode} />
    </div>
  )
}

function Legend({ mode }) {
  const items = mode === 'brainstorm'
    ? [['PERSON','#ffffff'],['SKILL','#7dd3fc'],['DOMAIN','#86efac'],['OVERLAP','#fde68a']]
    : [['PERSON','#ffffff'],['COMPONENT','#c4b5fd'],['DECISION','#fdba74']]
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: 20,
      border: '1px solid rgba(255,255,255,0.25)', padding: '12px 16px',
      fontFamily: "'Courier New', monospace", fontSize: 11,
      color: 'rgba(255,255,255,0.65)', letterSpacing: 1,
      background: 'rgba(13,79,140,0.85)', backdropFilter: 'blur(6px)'
    }}>
      <div style={{ marginBottom: 8, color: '#fff', letterSpacing: 3, fontSize: 10 }}>LEGEND</div>
      {items.map(([label, color]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
          <div style={{ width: 22, height: 12, border: `1px solid ${color}`, flexShrink: 0 }} />
          <span style={{ fontSize: 10 }}>{label}</span>
        </div>
      ))}
    </div>
  )
}
