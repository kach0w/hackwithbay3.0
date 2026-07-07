#!/usr/bin/env node
/**
 * Publish the public backend URL to Butterbase (append-only api_endpoints table).
 * Usage: npm run publish:api-url -- https://your-tunnel.loca.lt
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@butterbase/sdk'

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(backendRoot, '.env')

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error('❌ backend/.env not found')
    process.exit(1)
  }
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    if (!process.env[trimmed.slice(0, eq)]) process.env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
  }
}

loadEnv()

const apiUrl = process.argv[2]?.replace(/\/$/, '')
if (!apiUrl) {
  console.error('Usage: npm run publish:api-url -- https://your-tunnel.loca.lt')
  process.exit(1)
}

const health = await fetch(`${apiUrl}/health`).catch(() => null)
if (!health?.ok) {
  console.error(`❌ ${apiUrl}/health is not reachable — start backend + tunnel first`)
  process.exit(1)
}

const bb = createClient({
  appId: process.env.BUTTERBASE_APP_ID,
  apiUrl: process.env.BUTTERBASE_API_URL || 'https://api.butterbase.ai'
})
bb.setAccessToken(process.env.BUTTERBASE_API_KEY)

const { error } = await bb.from('api_endpoints').insert({ url: apiUrl })

if (error) {
  console.error('❌ Failed to publish:', error.message)
  process.exit(1)
}

console.log('✓ Published backend URL to Butterbase')
console.log('  ', apiUrl)
console.log('')
console.log('Teammates: https://hivemind.butterbase.dev')
