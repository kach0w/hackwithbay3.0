import React from 'react'

const bp = {
  bg: '#1464b4', border: 'rgba(255,255,255,0.3)',
  font: "'Courier New', monospace", text: '#fff', muted: 'rgba(255,255,255,0.5)'
}

export default function ModeSelect({ onSelect }) {
  return (
    <div style={{
      height: '100vh', background: bp.bg, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: bp.font, color: bp.text,
      backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,0.04) 0,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 24px),repeating-linear-gradient(90deg,rgba(255,255,255,0.04) 0,rgba(255,255,255,0.04) 1px,transparent 1px,transparent 24px)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{ fontSize: 28, letterSpacing: 8, fontWeight: 700 }}>HIVEMIND</div>
        <div style={{ fontSize: 10, color: bp.muted, letterSpacing: 4, marginTop: 8 }}>SELECT MODE</div>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        <ModeCard
          title="BRAINSTORM"
          subtitle="MAP YOUR TEAM"
          description="Add your GitHub — skills and domains populate the team graph. Overlaps reveal what to build together."
          tag="TEAM GRAPH"
          onClick={() => onSelect('brainstorm')}
        />
        <ModeCard
          title="PROJECT"
          subtitle="BUILD TOGETHER"
          description="Track decisions as a living graph. Decisions that conflict supersede each other. Dependency traversal tells you who to warn when things change."
          tag="DECISION GRAPH"
          onClick={() => onSelect('project')}
        />
      </div>
    </div>
  )
}

function ModeCard({ title, subtitle, description, tag, onClick }) {
  const [hover, setHover] = React.useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 280, padding: 32, textAlign: 'left', cursor: 'pointer',
        background: hover ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${hover ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)'}`,
        color: '#fff', fontFamily: "'Courier New', monospace",
        transition: 'all 0.15s'
      }}
    >
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, marginBottom: 12 }}>{tag}</div>
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 4, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, marginBottom: 20 }}>{subtitle}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, letterSpacing: 0.3 }}>{description}</div>
      <div style={{ marginTop: 28, fontSize: 10, letterSpacing: 3, color: hover ? '#ffe066' : 'rgba(255,255,255,0.4)' }}>
        ENTER →
      </div>
    </button>
  )
}
