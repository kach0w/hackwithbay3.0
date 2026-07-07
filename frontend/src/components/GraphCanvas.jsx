import React, { useRef, useCallback, useEffect } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

// Blueprint palette
const BP = {
  bg:         '#1464b4',
  grid:       'rgba(255,255,255,0.12)',
  white:      '#ffffff',
  whiteFaint: 'rgba(255,255,255,0.35)',
  deprecated: 'rgba(255,255,255,0.2)',
  highlight:  '#ffe066',
  person:     'rgba(255,255,255,0.08)',
  component:  'rgba(255,255,255,0.06)',
  decision:   'rgba(255,255,255,0.05)',
}

const NODE_W = { Person: 72, Component: 88, Decision: 96 }
const NODE_H = 28

function drawGrid(ctx, width, height) {
  const step = 24
  ctx.strokeStyle = BP.grid
  ctx.lineWidth = 0.5
  for (let x = 0; x < width; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke()
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
  }
}

export default function GraphCanvas({ graph, highlightIds = [] }) {
  const fgRef = useRef()
  const bgCanvasRef = useRef()

  // Draw grid on a background canvas
  useEffect(() => {
    const canvas = bgCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    ctx.fillStyle = BP.bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    drawGrid(ctx, canvas.width, canvas.height)
  }, [])

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const isDeprecated = node.deprecated
    const isHighlighted = highlightIds.includes(node.id)
    const label = (node.label || node.id).toUpperCase()
    const type = node.type || 'Component'

    const w = (NODE_W[type] || 88) / globalScale * 1.2
    const h = NODE_H / globalScale * 1.2
    const x = node.x - w / 2
    const y = node.y - h / 2
    const fontSize = Math.max(6, 9 / globalScale)
    const subFontSize = Math.max(4, 6 / globalScale)
    const lw = Math.max(0.3, 1 / globalScale)

    // Node box fill
    ctx.fillStyle = isDeprecated ? 'rgba(255,255,255,0.03)' : BP[type.toLowerCase()] || BP.component
    ctx.fillRect(x, y, w, h)

    // Node box border
    ctx.strokeStyle = isDeprecated ? BP.deprecated : isHighlighted ? BP.highlight : BP.white
    ctx.lineWidth = isHighlighted ? lw * 2 : lw
    ctx.setLineDash(isDeprecated ? [2 / globalScale, 2 / globalScale] : [])
    ctx.strokeRect(x, y, w, h)
    ctx.setLineDash([])

    // Corner tick marks (blueprint dimension style)
    if (!isDeprecated) {
      const tick = 4 / globalScale
      ctx.strokeStyle = BP.whiteFaint
      ctx.lineWidth = lw
      ;[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([cx, cy]) => {
        ctx.beginPath(); ctx.moveTo(cx - tick, cy); ctx.lineTo(cx + tick, cy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx, cy - tick); ctx.lineTo(cx, cy + tick); ctx.stroke()
      })
    }

    // Type tag (top-left, tiny)
    ctx.font = `${subFontSize}px 'Courier New', monospace`
    ctx.fillStyle = BP.whiteFaint
    ctx.textAlign = 'left'
    ctx.fillText(type.toUpperCase(), x + 2 / globalScale, y + subFontSize + 1 / globalScale)

    // Main label
    ctx.font = `bold ${fontSize}px 'Courier New', monospace`
    ctx.fillStyle = isDeprecated ? BP.deprecated : isHighlighted ? BP.highlight : BP.white
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, node.x, node.y + 2 / globalScale)

    // Deprecated: draw X through the box
    if (isDeprecated) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = lw
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x, y + h); ctx.stroke()
      // Timestamp
      if (node.ts) {
        ctx.font = `${subFontSize}px 'Courier New', monospace`
        ctx.fillStyle = BP.deprecated
        ctx.textAlign = 'center'
        ctx.fillText(new Date(node.ts).toLocaleTimeString(), node.x, y + h + subFontSize + 2 / globalScale)
      }
    }

    // Highlight pulse ring
    if (isHighlighted) {
      ctx.strokeStyle = BP.highlight
      ctx.lineWidth = lw * 1.5
      ctx.setLineDash([3 / globalScale, 3 / globalScale])
      ctx.strokeRect(x - 4 / globalScale, y - 4 / globalScale, w + 8 / globalScale, h + 8 / globalScale)
      ctx.setLineDash([])
    }

    node.__w = w
    node.__h = h
  }, [highlightIds])

  const linkColor = useCallback((link) => {
    if (link.type === 'SUPERSEDES') return 'rgba(255,255,255,0.5)'
    if (link.deprecated) return 'rgba(255,255,255,0.1)'
    return 'rgba(255,255,255,0.4)'
  }, [])

  const linkWidth = useCallback(() => 0.8, [])

  const linkLineDash = useCallback((link) =>
    link.type === 'SUPERSEDES' ? [4, 4] : link.type === 'DEPENDS_ON' ? [2, 2] : null
  , [])

  const nodePointerAreaPaint = useCallback((node, color, ctx) => {
    const w = node.__w || 88
    const h = node.__h || 28
    ctx.fillStyle = color
    ctx.fillRect(node.x - w / 2, node.y - h / 2, w, h)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={bgCanvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      <ForceGraph2D
        ref={fgRef}
        graphData={{
          nodes: graph.nodes.map(n => ({ ...n })),
          links: graph.edges.map(e => ({ ...e, source: e.source, target: e.target }))
        }}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        nodePointerAreaPaint={nodePointerAreaPaint}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkLineDash={linkLineDash}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={linkColor}
        backgroundColor="transparent"
        linkLabel={link => link.type}
      />
      <Legend />
    </div>
  )
}

function Legend() {
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16,
      border: '1px solid rgba(255,255,255,0.3)',
      padding: '8px 14px', fontSize: 11,
      fontFamily: "'Courier New', monospace",
      color: 'rgba(255,255,255,0.7)',
      letterSpacing: '1px',
      background: 'rgba(20,100,180,0.6)',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{ marginBottom: 6, color: '#fff', letterSpacing: 2 }}>LEGEND</div>
      {[['PERSON', '#fff'], ['COMPONENT', '#fff'], ['DECISION', '#fff']].map(([label, color]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 16, height: 10, border: `1px solid ${color}`, opacity: 0.7 }} />
          {label}
        </div>
      ))}
      <div style={{ marginTop: 6, opacity: 0.5, fontSize: 10 }}>── DEPENDS_ON &nbsp; ╌ SUPERSEDES</div>
    </div>
  )
}
