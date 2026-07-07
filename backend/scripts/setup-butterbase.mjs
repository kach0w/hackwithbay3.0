#!/usr/bin/env node
/**
 * One-shot Butterbase bootstrap for Hivemind.
 *
 * Prereqs:
 *   1. Sign up at https://dashboard.butterbase.ai/ (promo ENJOY0707)
 *   2. Create an app, copy App ID + API key + anon key into backend/.env
 *   3. Run: npm run setup:butterbase
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@butterbase/sdk'

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(backendRoot, '..')
const envPath = resolve(backendRoot, '.env')

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error('❌ backend/.env not found.')
    console.error('   cp backend/.env.example backend/.env')
    console.error('   Then paste credentials from https://dashboard.butterbase.ai/')
    process.exit(1)
  }

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    const val = trimmed.slice(eq + 1)
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnv()

const appId = process.env.BUTTERBASE_APP_ID
const apiUrl = process.env.BUTTERBASE_API_URL || 'https://api.butterbase.ai'
const apiKey = process.env.BUTTERBASE_API_KEY
const anonKey = process.env.BUTTERBASE_ANON_KEY

if (!appId || !apiKey) {
  console.error('❌ Set BUTTERBASE_APP_ID and BUTTERBASE_API_KEY in backend/.env')
  process.exit(1)
}

const bb = createClient({ appId, apiUrl })
bb.setAccessToken(apiKey)

const schema = JSON.parse(readFileSync(resolve(repoRoot, 'butterbase/schema.json'), 'utf8'))

console.log('→ Applying schema (graph_events table)…')
const { data: migration, error: schemaError } = await bb.admin.schema.apply(schema)
if (schemaError) {
  console.error('❌ Schema apply failed:', schemaError.message)
  process.exit(1)
}
console.log('✓', migration?.message || 'Schema applied')

console.log('→ Enabling realtime on graph_events…')
const { error: rtError } = await bb.admin.realtime.configure(['graph_events'])
if (rtError) {
  console.error('❌ Realtime config failed:', rtError.message)
  process.exit(1)
}
console.log('✓ Realtime enabled')

console.log('→ Testing insert…')
const { error: insertError } = await bb.from('graph_events').insert({
  author: 'setup-script',
  intent: 'ping',
  component: null
})
if (insertError) {
  console.error('❌ Test insert failed:', insertError.message)
  process.exit(1)
}
console.log('✓ Insert OK')

console.log('')
console.log('Butterbase is ready. Next:')
console.log('  1. cd backend && npm run dev')
console.log('  2. Start tunnel: npx localtunnel --port 3001')
console.log('  3. npm run publish:api-url -- https://your-tunnel.loca.lt')
console.log('  4. cd frontend && npm run dev')
console.log('     frontend/.env needs VITE_BUTTERBASE_APP_ID (see frontend/.env.example)')
