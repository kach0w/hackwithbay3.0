import { createClient } from '@butterbase/sdk'

const appId = process.env.BUTTERBASE_APP_ID
const apiUrl = process.env.BUTTERBASE_API_URL || 'https://api.butterbase.ai'
const apiKey = process.env.BUTTERBASE_API_KEY

let client = null

function getClient() {
  if (!appId || !apiKey) return null
  if (!client) {
    client = createClient({ appId, apiUrl })
    client.setAccessToken(apiKey)
  }
  return client
}

export function isConfigured() {
  return Boolean(appId && apiKey)
}

/** Insert a graph_events row — clients subscribe via Butterbase realtime. */
export async function broadcast(event) {
  const bb = getClient()
  if (!bb) {
    console.warn('[Butterbase] Not configured — skipping broadcast')
    return
  }

  const { error } = await bb.from('graph_events').insert({
    author: event.author,
    intent: event.intent ?? 'update',
    component: event.component ?? null
  })

  if (error) throw error
}

export async function checkConnection() {
  const bb = getClient()
  if (!bb) return { ok: false, error: 'Missing BUTTERBASE_APP_ID or BUTTERBASE_API_KEY' }

  const { error } = await bb.from('graph_events').select('id').limit(1)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
