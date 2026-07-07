import { butterbase, butterbaseConfigured } from './butterbase.js'

const BUILD_TIME_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const STORAGE_KEY = 'hivemind_api_url'
const PROBE_MS = 3000

let resolvedBase = BUILD_TIME_BASE
let initPromise = null

function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/$/, '')
}

function fromQuery() {
  const raw = new URLSearchParams(window.location.search).get('api')
  if (!raw) return null
  const url = normalizeUrl(raw)
  sessionStorage.setItem(STORAGE_KEY, url)
  return url
}

function fromStorage() {
  return sessionStorage.getItem(STORAGE_KEY) || null
}

async function fromButterbase() {
  if (!butterbaseConfigured || !butterbase) return null

  const { data: latest, error: latestErr } = await butterbase
    .from('api_endpoints')
    .select('url')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestErr && latest?.url) {
    const url = normalizeUrl(latest.url)
    if (url) return url
  }

  const { data, error } = await butterbase
    .from('app_config')
    .select('value')
    .eq('key', 'api_url')
    .maybeSingle()

  if (error) {
    console.warn('[api-config] Butterbase lookup failed:', error.message)
    return null
  }
  return normalizeUrl(data?.value) || null
}

async function probe(url) {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(PROBE_MS) })
    const text = await res.text()
    if (!res.ok || text.trimStart().startsWith('<')) return false
    return text.includes('"status"')
  } catch {
    return false
  }
}

async function pickWorkingUrl(candidates) {
  const unique = [...new Set(candidates.filter(Boolean))]
  if (!unique.length) return BUILD_TIME_BASE

  const results = await Promise.all(
    unique.map(async url => ({ url, ok: await probe(url) }))
  )
  const hit = results.find(r => r.ok)
  if (hit) {
    resolvedBase = hit.url
    sessionStorage.setItem(STORAGE_KEY, hit.url)
    return hit.url
  }

  // Drop stale cached tunnel URLs so the next load re-fetches from Butterbase.
  sessionStorage.removeItem(STORAGE_KEY)
  resolvedBase = unique[0]
  return unique[0]
}

export function getApiBase() {
  return resolvedBase || BUILD_TIME_BASE
}

export async function initApiBase() {
  if (initPromise) return initPromise

  initPromise = (async () => {
    const local = normalizeUrl(BUILD_TIME_BASE)
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      if (await probe(local)) {
        resolvedBase = local
        sessionStorage.removeItem(STORAGE_KEY)
        return local
      }
    }

    const query = fromQuery()
    const remote = await fromButterbase()
    const stored = fromStorage()

    if (query) {
      if (await probe(query)) {
        resolvedBase = query
        sessionStorage.setItem(STORAGE_KEY, query)
        return query
      }
    }

    // Prefer Butterbase over sessionStorage — cached tunnels die when host restarts.
    const storedOk = stored && await probe(stored) ? stored : null
    return pickWorkingUrl([remote, query, storedOk, local].filter(Boolean))
  })()

  return initPromise
}

export async function setApiBase(url) {
  const normalized = normalizeUrl(url)
  if (!normalized) throw new Error('Backend URL required')
  if (!(await probe(normalized))) {
    throw new Error('Could not reach backend at that URL (/health failed)')
  }
  resolvedBase = normalized
  sessionStorage.setItem(STORAGE_KEY, normalized)
  return normalized
}
