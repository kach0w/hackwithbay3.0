const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export async function fetchGraph() {
  const res = await fetch(`${BASE}/graph`)
  return res.json()
}

export async function postEvent(text, author) {
  const res = await fetch(`${BASE}/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, author })
  })
  return res.json()
}
