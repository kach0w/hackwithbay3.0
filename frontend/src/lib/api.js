import { getApiBase, initApiBase } from './api-config.js'

export { getApiBase, initApiBase, setApiBase } from './api-config.js'

async function parseJson(res) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error(
        'Backend returned HTML instead of JSON. The API URL is wrong or the tunnel is down. ' +
        'Host: run `npm run publish:api-url <tunnel-url>` after starting the backend tunnel.'
      )
    }
    throw new Error(`Invalid backend response: ${text.slice(0, 120)}`)
  }
}

async function apiFetch(path, options) {
  await initApiBase()
  const base = getApiBase()
  let res
  try {
    res = await fetch(`${base}${path}`, options)
  } catch {
    throw new Error(
      `Cannot reach backend at ${base}. Host must run backend + tunnel, then publish the URL.`
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
