const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function apiFetch(path, options) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, options)
  } catch {
    throw new Error(
      BASE.includes('localhost')
        ? 'Cannot reach the Hivemind backend. Make sure the host is running the backend on port 3001.'
        : 'Cannot reach the Hivemind backend. The host may be offline or the API URL is misconfigured.'
    )
  }
  return res
}

export async function createSession() {
  const res = await apiFetch('/session', { method: 'POST' })
  return res.json()
}

export async function joinSession(sessionId, profile) {
  const res = await apiFetch(`/session/${sessionId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Join failed')
  return data
}

export async function fetchBrainstormGraph(sessionId) {
  const res = await apiFetch(`/graph/brainstorm/${sessionId}`)
  return res.json()
}

export async function fetchProjectGraph(sessionId) {
  const res = await apiFetch(`/graph/project/${sessionId}`)
  return res.json()
}

export async function recomputeOverlaps(sessionId) {
  const res = await apiFetch(`/graph/brainstorm/${sessionId}/overlaps`, { method: 'POST' })
  return res.json()
}

export async function postEvent(sessionId, text, member) {
  const res = await apiFetch(`/event/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      author: member.name,
      personId: member.personId
    })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Event failed')
  return data
}
