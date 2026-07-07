const BUILD_TIME_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/** Deployed frontend needs a public backend URL. Override via ?api=https://your-tunnel without redeploying. */
export function getApiBase() {
  if (typeof window === 'undefined') return BUILD_TIME_BASE

  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get('api')
  if (fromQuery) {
    const url = fromQuery.replace(/\/$/, '')
    sessionStorage.setItem('hivemind_api_url', url)
    return url
  }

  const stored = sessionStorage.getItem('hivemind_api_url')
  if (stored) return stored

  return BUILD_TIME_BASE
}

async function parseJson(res) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error(
        'Backend returned HTML instead of JSON — the API tunnel is down or the URL is wrong. ' +
        'Host: restart `npx localtunnel --port 3001`, then open the app with `?api=<tunnel-url>` on the link you share.'
      )
    }
    throw new Error(`Invalid backend response: ${text.slice(0, 120)}`)
  }
}

async function apiFetch(path, options) {
  const base = getApiBase()
  let res
  try {
    res = await fetch(`${base}${path}`, options)
  } catch {
    throw new Error(
      base.includes('localhost')
        ? 'Cannot reach the Hivemind backend. Run `cd backend && npm run dev` on port 3001.'
        : `Cannot reach backend at ${base}. Host must run the backend + tunnel, or add ?api=<tunnel-url> to the link.`
    )
  }
  return res
}

export async function createSession() {
  const res = await apiFetch('/session', { method: 'POST' })
  const data = await parseJson(res)
  if (!res.ok) throw new Error(data.error || 'Could not create session')
  if (!data?.sessionId) throw new Error('Backend did not return a session id')
  return data
}

export async function joinSession(sessionId, profile) {
  const res = await apiFetch(`/session/${sessionId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  })
  const data = await parseJson(res)
  if (!res.ok) throw new Error(data.error || 'Join failed')
  return data
}

export async function fetchBrainstormGraph(sessionId) {
  const res = await apiFetch(`/graph/brainstorm/${sessionId}`)
  const data = await parseJson(res)
  if (!res.ok) throw new Error(data.error || 'Could not load brainstorm graph')
  return data
}

export async function fetchProjectGraph(sessionId) {
  const res = await apiFetch(`/graph/project/${sessionId}`)
  const data = await parseJson(res)
  if (!res.ok) throw new Error(data.error || 'Could not load project graph')
  return data
}

export async function recomputeOverlaps(sessionId) {
  const res = await apiFetch(`/graph/brainstorm/${sessionId}/overlaps`, { method: 'POST' })
  const data = await parseJson(res)
  if (!res.ok) throw new Error(data.error || 'Overlap recompute failed')
  return data
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
  const data = await parseJson(res)
  if (!res.ok) throw new Error(data.error || 'Event failed')
  return data
}
