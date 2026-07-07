#!/usr/bin/env node
/**
 * Bootstrap Butterbase Stripe Connect + Team Pass product for Hivemind.
 * Run once: npm run setup:billing
 */
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@butterbase/sdk'

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(backendRoot, '..')
const envPath = resolve(backendRoot, '.env')
const frontendEnvPath = resolve(repoRoot, 'frontend/.env')

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

function upsertEnv(path, key, value) {
  if (!existsSync(path)) return
  const lines = readFileSync(path, 'utf8').split('\n')
  const prefix = `${key}=`
  const idx = lines.findIndex(l => l.startsWith(prefix))
  if (idx >= 0) lines[idx] = `${key}=${value}`
  else lines.push(`${key}=${value}`)
  writeFileSync(path, lines.filter((l, i, a) => l || i < a.length - 1).join('\n') + '\n')
}

loadEnv()

const appId = process.env.BUTTERBASE_APP_ID
const apiKey = process.env.BUTTERBASE_API_KEY
const apiUrl = process.env.BUTTERBASE_API_URL || 'https://api.butterbase.ai'

const bb = createClient({ appId, apiUrl })
bb.setAccessToken(apiKey)

console.log('→ Stripe Connect status…')
const { data: status } = await bb.billing.connectStatus()
if (!status?.chargesEnabled) {
  const { data: onboard, error } = await bb.billing.connectOnboard()
  if (error) {
    console.error('❌ Connect onboard failed:', error.message)
    process.exit(1)
  }
  console.log('⚠ Complete Stripe Connect onboarding in your browser:')
  console.log(' ', onboard.onboardingUrl)
}

let productId = process.env.BUTTERBASE_TEAM_PRODUCT_ID
const { data: products } = await bb.billing.listProducts()
const existing = (products || []).find(p => p.metadata?.sku === 'team_pass' || p.name === 'Hivemind Team Pass')

if (existing) {
  productId = existing.id
  console.log('✓ Team Pass product exists:', productId)
} else {
  console.log('→ Creating Hivemind Team Pass product ($1)…')
  const { data: created, error } = await bb.billing.createProduct({
    name: 'Hivemind Team Pass',
    description: 'Unlock one shared hivemind session for your whole team',
    priceCents: 100,
    metadata: { sku: 'team_pass' }
  })
  if (error) {
    console.error('❌ createProduct failed:', error.message)
    process.exit(1)
  }
  productId = created.id
  console.log('✓ Created product:', productId)
}

upsertEnv(envPath, 'BUTTERBASE_TEAM_PRODUCT_ID', productId)
upsertEnv(frontendEnvPath, 'VITE_BUTTERBASE_TEAM_PRODUCT_ID', productId)

console.log('')
console.log('Billing ready. Added to backend/.env and frontend/.env:')
console.log(`  BUTTERBASE_TEAM_PRODUCT_ID=${productId}`)
console.log(`  VITE_BUTTERBASE_TEAM_PRODUCT_ID=${productId}`)
