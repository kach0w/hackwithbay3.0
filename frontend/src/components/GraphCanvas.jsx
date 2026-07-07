import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

const COLORS = {
  Person:    { stroke: '#ffffff',  fill: 'rgba(255,255,255,0.14)' },
  Skill:     { stroke: '#7dd3fc', fill: 'rgba(125,211,252,0.12)' },
  Domain:    { stroke: '#86efac', fill: 'rgba(134,239,172,0.12)' },
  Overlap:   { stroke: '#fde68a', fill: 'rgba(253,230,138,0.16)' },
  Component: { stroke: '#c4b5fd', fill: 'rgba(196,181,253,0.10)' },
  Decision:  { stroke: '#fdba74', fill: 'rgba(253,186,116,0.12)' },
}

const DEPRECATED_COLOR = 'rgba(255,255,255,0.2)'

const NODE_SIZE = {
  Person:    { w: 228, h: 76 },
  Overlap:   { w: 220, h: 56 },
  Decision:  { w: 200, h: 48 },
  Skill:     { w: 148, h: 40 },
  Domain:    { w: 158, h: 40 },
  Component: { w: 168, h: 44 },
}

function getSize(type) { return NODE_SIZE[type] || { w: 140, h: 40 } }
function nid(x) { return x?.id ?? x }

function wrapLines(ctx, text, maxWidth, maxLines = 2) {
  const words = String(text).toUpperCase().split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
    if (lines.length >= maxLines) break
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (words.length && lines.length === maxLines) {
    const last = lines[maxLines - 1]
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 3) {
      lines[maxLines - 1] = last.slice(0, -1)
    }
    if (!lines[maxLines - 1].endsWith('…')) lines[maxLines - 1] += '…'
  }
  return lines.length ? lines : [String(text).toUpperCase()]
}

// Column-per-person layout for brainstorm; structured grid for project
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
  const padX = 140
  const padY = 90

  if (mode === 'brainstorm') {
    const colW = Math.max(240, (W - padX * 2) / Math.max(persons.length, 1))

    const owner = {}
    for (const e of edges) {
      const sid = nid(e.source), tid = nid(e.target)
      const sn = nodes.find(n => n.id === sid)
      const tn = nodes.find(n => n.id === tid)
      if (!sn || !tn) continue
      if (sn.type === 'Person' && (tn.type === 'Skill' || tn.type === 'Domain')) owner[tn.id] = sn.id
      if (tn.type === 'Person' && (sn.type === 'Skill' || sn.type === 'Domain')) owner[sn.id] = tn.id
    }

    const skillsByPerson = {}
    const domainsByPerson = {}
    for (const s of skills) {
      const pid = owner[s.id] || '_orphan'
      ;(skillsByPerson[pid] ||= []).push(s)
    }
    for (const d of domains) {
      const pid = owner[d.id] || '_orphan'
      ;(domainsByPerson[pid] ||= []).push(d)
    }

    persons.forEach((p, i) => {
      const cx = padX + colW * i + colW / 2
      pos[p.id] = { x: Math.round(cx), y: Math.round(padY) }

      const pSkills = skillsByPerson[p.id] || []
      const pDomains = domainsByPerson[p.id] || []
      const skillCols = 2
      const rowH = 52

      pSkills.forEach((s, idx) => {
        const col = idx % skillCols
        const row = Math.floor(idx / skillCols)
        pos[s.id] = {
          x: Math.round(cx + (col - 0.5) * 162),
          y: Math.round(padY + 100 + row * rowH)
        }
      })

      const skillRows = Math.ceil(pSkills.length / skillCols) || 0
      const domainStartY = padY + 100 + skillRows * rowH + 36

      pDomains.forEach((d, idx) => {
        const col = idx % skillCols
        const row = Math.floor(idx / skillCols)
        pos[d.id] = {
          x: Math.round(cx + (col - 0.5) * 168),
          y: Math.round(domainStartY + row * rowH)
        }
      })
    })

  // Orphan skills/domains (no person edge yet)
    for (const s of skillsByPerson['_orphan'] || []) {
      if (!pos[s.id]) pos[s.id] = { x: Math.round(W / 2), y: Math.round(H * 0.45) }
    }
    for (const d of domainsByPerson['_orphan'] || []) {
      if (!pos[d.id]) pos[d.id] = { x: Math.round(W / 2), y: Math.round(H * 0.62) }
    }

    for (const o of overlaps) {
      const personIds = edges
        .filter(e => nid(e.source) === o.id || nid(e.target) === o.id)
        .map(e => nid(e.source) === o.id ? nid(e.target) : nid(e.source))
        .filter(id => persons.find(p => p.id === id))
      const pPoses = personIds.map(id => pos[id]).filter(Boolean)
      pos[o.id] = {
        x: Math.round(pPoses.length ? pPoses.reduce((s, p) => s + p.x, 0) / pPoses.length : W / 2),
        y: Math.round(H - padY)
      }
    }
  } else {
    const rowH = Math.max(88, (H - padY * 2) / Math.max(persons.length, components.length, 1))
    persons.forEach((p, i) => {
      pos[p.id] = { x: padX, y: Math.round(padY + i * rowH) }
    })
    components.forEach((c, i) => {
      pos[c.id] = { x: padX + 280, y: Math.round(padY + i * rowH) }
    })
    decisions.forEach((d, i) => {
      pos[d.id] = {
        x: padX + 520 + (i % 2) * 220,
        y: Math.round(padY + Math.floor(i / 2) * 72)
      }
    })
  }

  return pos
}

export default function GraphCanvas({ graph, highlightIds = [], mode = 'brainstorm', onNodeClick }) {
  const bgRef        = useRef()
  const fgRef        = useRef()
  const containerRef = useRef()
  const [dims, setDims] = useState({ w: 900, h: 600 })

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

  useEffect(() => {
    if (!fgRef.current || !graphData.nodes.length) return
    const t = setTimeout(() => {
      fgRef.current.zoomToFit(500, 72)
    }, 80)
    return () => clearTimeout(t)
  }, [graphData, dims.w, dims.h])

  const nodeCanvasObject = useCallback((node, ctx, gs) => {
    const isDeprecated  = node.deprecated
    const isHighlighted = highlightIds.includes(node.id)
    const label  = node.label || node.id || ''
    const type   = node.type || 'Component'
    const colors = COLORS[type] || COLORS.Component
    const { w, h } = getSize(type)
    const sw = w / gs, sh = h / gs
    const x  = node.x - sw / 2, y = node.y - sh / 2
    const lw = Math.max(0.6, 1.4 / gs)
    const isPerson = type === 'Person'

    ctx.fillStyle   = isDeprecated ? 'rgba(255,255,255,0.02)' : colors.fill
    ctx.fillRect(x, y, sw, sh)
    ctx.strokeStyle = isDeprecated ? DEPRECATED_COLOR : isHighlighted ? '#ffe066' : colors.stroke
    ctx.lineWidth   = isHighlighted ? lw * 2.5 : lw
    ctx.setLineDash(isDeprecated ? [3 / gs, 3 / gs] : [])
    ctx.strokeRect(x, y, sw, sh)
    ctx.setLineDash([])

    const sfs = Math.max(6, 8 / gs)
    const fs  = Math.max(8, isPerson ? 12 / gs : 10 / gs)
    const innerW = sw - 16 / gs

    ctx.font      = `${sfs}px 'Courier New', monospace`
    ctx.fillStyle = 'rgba(255,255,255,0.38)'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(type.toUpperCase(), x + 6 / gs, y + 5 / gs)

    ctx.font         = `bold ${fs}px 'Courier New', monospace`
    ctx.fillStyle    = isDeprecated ? DEPRECATED_COLOR : isHighlighted ? '#ffe066' : colors.stroke
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'

    if (isPerson) {
      const lines = wrapLines(ctx, label, innerW, 2)
      const lineH = fs * 1.25
      const startY = node.y - ((lines.length - 1) * lineH) / 2 + 4 / gs
      lines.forEach((line, i) => ctx.fillText(line, node.x, startY + i * lineH))
      if (node.archetype) {
        ctx.font = `${sfs}px 'Courier New', monospace`
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        const arch = String(node.archetype).toUpperCase()
        const archLine = arch.length > 28 ? `${arch.slice(0, 26)}…` : arch
        ctx.fillText(archLine, node.x, y + sh - 12 / gs)
      }
    } else {
      const lines = wrapLines(ctx, label, innerW, 2)
      const lineH = fs * 1.2
      const startY = node.y - ((lines.length - 1) * lineH) / 2 + 2 / gs
      lines.forEach((line, i) => ctx.fillText(line, node.x, startY + i * lineH))
    }

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
      ctx.strokeRect(x - 6 / gs, y - 6 / gs, sw + 12 / gs, sh + 12 / gs)
      ctx.setLineDash([])
    }

    node.__w = sw; node.__h = sh
  }, [highlightIds])

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
        ref={fgRef}
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
        minZoom={0.35}
        maxZoom={2.5}
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
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, marginTop: 6 }}>SCROLL TO ZOOM</div>
    </div>
  )
}
