const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export async function createSession() {
  const res = await fetch(`${BASE}/session`, { method: 'POST' })
  return res.json() // { sessionId }
}

export async function joinSession(sessionId, profile) {
  const res = await fetch(`${BASE}/session/${sessionId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  })
  return res.json()
}

export async function fetchGraph(sessionId) {
  const res = await fetch(`${BASE}/graph/${sessionId}`)
  return res.json()
}

export async function postEvent(sessionId, text, author) {
  const res = await fetch(`${BASE}/event/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, author })
  })
  return res.json()
}
