const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export async function createSession() {
  const res = await fetch(`${BASE}/session`, { method: 'POST' })
  return res.json()
}

export async function joinSession(sessionId, profile) {
  const res = await fetch(`${BASE}/session/${sessionId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Join failed')
  return data
}

export async function fetchBrainstormGraph(sessionId) {
  const res = await fetch(`${BASE}/graph/brainstorm/${sessionId}`)
  return res.json()
}

export async function fetchProjectGraph(sessionId) {
  const res = await fetch(`${BASE}/graph/project/${sessionId}`)
  return res.json()
}

export async function recomputeOverlaps(sessionId) {
  const res = await fetch(`${BASE}/graph/brainstorm/${sessionId}/overlaps`, { method: 'POST' })
  return res.json()
}

export async function postEvent(sessionId, text, member) {
  const res = await fetch(`${BASE}/event/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      author: member.name,
      personId: member.personId
    })
  })
  return res.json()
}
