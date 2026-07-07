import React, { useRef, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

const NODE_COLORS = {
  Person:    '#60a5fa',
  Component: '#34d399',
  Decision:  '#fbbf24'
}

const DEPRECATED_COLOR = '#4b5563'

export default function GraphCanvas({ graph, highlightIds = [] }) {
  const fgRef = useRef()

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const isDeprecated = node.deprecated
    const isHighlighted = highlightIds.includes(node.id)
    const color = isDeprecated ? DEPRECATED_COLOR : (NODE_COLORS[node.type] || '#e5e7eb')
    const label = node.label || node.id
    const fontSize = Math.max(10 / globalScale, 3)

    // Node circle
    ctx.beginPath()
    ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()

    if (isHighlighted) {
      ctx.strokeStyle = '#f87171'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Label
    ctx.font = `${fontSize}px Sans-Serif`
    ctx.fillStyle = isDeprecated ? '#6b7280' : '#f9fafb'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    if (isDeprecated) {
      // Strikethrough effect
      const textWidth = ctx.measureText(label).width
      ctx.fillText(label, node.x, node.y + 10)
      ctx.beginPath()
      ctx.moveTo(node.x - textWidth / 2, node.y + 10)
      ctx.lineTo(node.x + textWidth / 2, node.y + 10)
      ctx.strokeStyle = '#6b7280'
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Timestamp
      if (node.ts) {
        ctx.font = `${fontSize * 0.7}px Sans-Serif`
        ctx.fillStyle = '#4b5563'
        ctx.fillText(new Date(node.ts).toLocaleTimeString(), node.x, node.y + 15)
      }
    } else {
      ctx.fillText(label, node.x, node.y + 10)
    }
  }, [highlightIds])

  const linkColor = useCallback((link) =>
    link.deprecated ? '#374151' : link.type === 'SUPERSEDES' ? '#ef4444' : '#6b7280'
  , [])

  const linkWidth = useCallback((link) =>
    highlightIds.includes(link.source.id) && highlightIds.includes(link.target?.id) ? 2 : 1
  , [highlightIds])

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={{
        nodes: graph.nodes.map(n => ({ ...n })),
        links: graph.edges.map(e => ({ ...e, source: e.source, target: e.target }))
      }}
      nodeCanvasObject={nodeCanvasObject}
      nodeCanvasObjectMode={() => 'replace'}
      linkColor={linkColor}
      linkWidth={linkWidth}
      linkDirectionalArrowLength={4}
      linkDirectionalArrowRelPos={1}
      backgroundColor="#0f172a"
      linkLabel={link => link.type}
    />
  )
}
