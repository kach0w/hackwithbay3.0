import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', background: '#1464b4', color: '#fff',
          fontFamily: "'Courier New', monospace", padding: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ maxWidth: 520, border: '1px solid rgba(255,255,255,0.3)', padding: 28 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: '#fca5a5', marginBottom: 12 }}>
              SOMETHING WENT WRONG
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              {this.state.error.message || String(this.state.error)}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)', fontFamily: 'inherit',
                fontSize: 11, letterSpacing: 2, padding: '10px 16px', cursor: 'pointer'
              }}
            >
              RELOAD
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
