// Butterbase realtime channel: "project:default"
// Docs: check your Butterbase project dashboard for the JS client

const BUTTERBASE_URL = process.env.BUTTERBASE_URL
const BUTTERBASE_KEY = process.env.BUTTERBASE_API_KEY

export async function broadcast(event) {
  if (!BUTTERBASE_URL || !BUTTERBASE_KEY) {
    console.warn('[Butterbase] Not configured — skipping broadcast')
    return
  }

  await fetch(`${BUTTERBASE_URL}/realtime/channels/project:default/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BUTTERBASE_KEY}`
    },
    body: JSON.stringify(event)
  })
}

// Call this on the frontend to subscribe
// Replace with actual Butterbase client SDK once you have it
export const CLIENT_SNIPPET = `
import { createClient } from '@butterbase/js'

const bb = createClient(BUTTERBASE_URL, BUTTERBASE_ANON_KEY)

export function subscribeToGraph(onUpdate) {
  const channel = bb.channel('project:default')
  channel.on('graph_update', onUpdate).subscribe()
  return () => channel.unsubscribe()
}
`
