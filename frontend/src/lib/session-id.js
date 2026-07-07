/** Extract hivemind session id from a raw id or share URL. */
export function parseSessionId(input) {
  const raw = String(input || '').trim()
  if (!raw) return ''

  const fromQuery = raw.match(/[?&]s=([a-zA-Z0-9_-]+)/)
  if (fromQuery) return fromQuery[1]

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const id = new URL(raw).searchParams.get('s')
      if (id) return id
    } catch {
      // ignore malformed URL
    }
  }

  return raw.split('/').pop().split('?')[0].trim()
}

export function shareUrlFor(sessionId) {
  return `${window.location.origin}?s=${sessionId}`
}
