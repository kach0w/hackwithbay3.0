import React, { useRef, useCallback, useEffect } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

const COLORS = {
  Person:    { stroke: '#ffffff', fill: 'rgba(255,255,255,0.08)' },
  Skill:     { stroke: '#7dd3fc', fill: 'rgba(125,211,252,0.08)' },
  Domain:    { stroke: '#86efac', fill: 'rgba(134,239,172,0.08)' },
  Overlap:   { stroke: '#fde68a', fill: 'rgba(253,230,138,0.12)' },
  Component: { stroke: '#c4b5fd', fill: 'rgba(196,181,253,0.08)' },
  Decision:  { stroke: '#fdba74', fill: 'rgba(253,186,116,0.08)' },
}

const DEPRECATED_COLOR = 'rgba(255,255,255,0.2)'

function getNodeSize(node) {
  if (node.type === 'Person')  return { w: 100, h: 32 }
  if (node.type === 'Overlap') return { w: 120, h: 36 }
  if (node.type === 'Decision') return { w: 130, h: 28 }
  return { w: 80, h: 26 }
}

export default function GraphCanvas({ graph, highlightIds = [], mode = 'brainstorm' }) {
  const fgRef = useRef()
  const bgRef = useRef()

  useEffect(() => {
    const canvas = bgRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    ctx.fillStyle = '#1464b4'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const step = 24
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 0.5
    for (let x = 0; x < canvas.width;  x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke() }
    for (let y = 0; y < canvas.height; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke() }
  }, [])

  const nodeCanvasObject = useCallback((node, ctx, gs) => {
    const isDeprecated  = node.deprecated
    const isHighlighted = highlightIds.includes(node.id)
    const label  = (node.label || node.id || '').toUpperCase()
    const type   = node.type || 'Component'
    const colors = COLORS[type] || COLORS.Component
    const { w, h } = getNodeSize(node)
    const sw = w / gs, sh = h / gs
    const x = node.x - sw / 2, y = node.y - sh / 2
    const lw = Math.max(0.4, 1 / gs)
    const fs = Math.max(5, 9 / gs)
    const sfs = Math.max(3.5, 6 / gs)

    // Fill
    ctx.fillStyle = isDeprecated ? 'rgba(255,255,255,0.02)' : colors.fill
    ctx.fillRect(x, y, sw, sh)

    // Border
    ctx.strokeStyle = isDeprecated ? DEPRECATED_COLOR : isHighlighted ? '#ffe066' : colors.stroke
    ctx.lineWidth   = isHighlighted ? lw * 2 : lw
    ctx.setLineDash(isDeprecated ? [2 / gs, 2 / gs] : [])
    ctx.strokeRect(x, y, sw, sh)
    ctx.setLineDash([])

    // Corner ticks
    if (!isDeprecated) {
      const t = 3 / gs
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = lw * 0.7
      ;[[x, y], [x + sw, y], [x, y + sh], [x + sw, y + sh]].forEach(([cx, cy]) => {
        ctx.beginPath(); ctx.moveTo(cx - t, cy); ctx.lineTo(cx + t, cy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx, cy - t); ctx.lineTo(cx, cy + t); ctx.stroke()
      })
    }

    // Type label
    ctx.font = `${sfs}px 'Courier New', monospace`
    ctx.fillStyle = isDeprecated ? DEPRECATED_COLOR : 'rgba(255,255,255,0.35)'
    ctx.textAlign = 'left'
    ctx.fillText(type.toUpperCase(), x + 2 / gs, y + sfs + 1 / gs)

    // Main label
    ctx.font = `bold ${fs}px 'Courier New', monospace`
    ctx.fillStyle = isDeprecated ? DEPRECATED_COLOR : isHighlighted ? '#ffe066' : colors.stroke
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label.length > 16 ? label.slice(0, 14) + '..' : label, node.x, node.y + 2 / gs)

    if (isDeprecated) {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = lw
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sw, y + sh); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + sw, y); ctx.lineTo(x, y + sh); ctx.stroke()
    }

    if (isHighlighted) {
      ctx.strokeStyle = '#ffe066'
      ctx.lineWidth = lw
      ctx.setLineDash([3 / gs, 3 / gs])
      ctx.strokeRect(x - 4 / gs, y - 4 / gs, sw + 8 / gs, sh + 8 / gs)
      ctx.setLineDash([])
    }

    node.__w = sw; node.__h = sh
  }, [highlightIds])

  // 90-degree orthogonal edge routing
  const linkCanvasObject = useCallback((link, ctx) => {
    const src = link.source
    const tgt = link.target
    if (!src?.x || !tgt?.x) return

    const isDeprecated  = link.deprecated
    const isSupersedes  = link.type === 'SUPERSEDES'
    const isOverlap     = link.type === 'OVERLAPS_WITH'

    ctx.strokeStyle = isDeprecated ? 'rgba(255,255,255,0.1)'
      : isSupersedes ? 'rgba(255,180,100,0.7)'
      : isOverlap    ? 'rgba(253,230,138,0.6)'
      : 'rgba(255,255,255,0.35)'
    ctx.lineWidth = isOverlap ? 1.5 : 0.8
    ctx.setLineDash(isDeprecated ? [4, 4] : isSupersedes ? [3, 3] : [])

    // Route: horizontal from source to midpoint X, then vertical, then horizontal to target
    const midX = (src.x + tgt.x) / 2
    ctx.beginPath()
    ctx.moveTo(src.x, src.y)
    ctx.lineTo(midX, src.y)
    ctx.lineTo(midX, tgt.y)
    ctx.lineTo(tgt.x, tgt.y)
    ctx.stroke()
    ctx.setLineDash([])

    // Arrow at target
    const arrowSize = 4
    const angle = Math.atan2(tgt.y - src.y, tgt.x - midX) // direction of last segment
    const finalAngle = tgt.y === src.y ? Math.atan2(0, tgt.x - src.x) : Math.atan2(tgt.y - src.y, 0)
    ctx.fillStyle = ctx.strokeStyle
    ctx.beginPath()
    ctx.moveTo(tgt.x, tgt.y)
    ctx.lineTo(tgt.x - arrowSize * Math.cos(finalAngle - 0.4), tgt.y - arrowSize * Math.sin(finalAngle - 0.4))
    ctx.lineTo(tgt.x - arrowSize * Math.cos(finalAngle + 0.4), tgt.y - arrowSize * Math.sin(finalAngle + 0.4))
    ctx.closePath()
    ctx.fill()
  }, [])

  const nodePointerAreaPaint = useCallback((node, color, ctx) => {
    const w = node.__w || 80, h = node.__h || 26
    ctx.fillStyle = color
    ctx.fillRect(node.x - w / 2, node.y - h / 2, w, h)
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
        linkLabel={link => link.type}
        d3AlphaDecay={0.03}
        d3VelocityDecay={0.3}
        cooldownTicks={80}
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
      position: 'absolute', bottom: 16, left: 16,
      border: '1px solid rgba(255,255,255,0.25)', padding: '10px 14px',
      fontFamily: "'Courier New', monospace", fontSize: 10,
      color: 'rgba(255,255,255,0.6)', letterSpacing: 1,
      background: 'rgba(20,100,180,0.7)', backdropFilter: 'blur(4px)'
    }}>
      <div style={{ marginBottom: 8, color: '#fff', letterSpacing: 3 }}>LEGEND</div>
      {items.map(([label, color]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 18, height: 10, border: `1px solid ${color}` }} />
          {label}
        </div>
      ))}
    </div>
  )
}
