import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const defaultPipeline = resolve(repoRoot, 'rocketride/hivemind-decision-extract.pipe')

export function isConfigured() {
  return Boolean(
    process.env.ROCKETRIDE_HTTP_URL ||
    (process.env.ROCKETRIDE_URI && process.env.ROCKETRIDE_APIKEY)
  )
}

function parseExtractionPayload(raw) {
  if (!raw) throw new Error('Empty RocketRide response')

  let text = raw
  if (typeof raw === 'object') {
    text = raw.text ?? raw.body ?? raw.answer ?? raw.content
    if (text && typeof text === 'object') {
      if (text.intent) return text
      text = text.text ?? text.content ?? JSON.stringify(text)
    }
    if (Array.isArray(raw.answers) && raw.answers[0]) {
      const a = raw.answers[0]
      text = typeof a === 'string' ? a : (a.answer ?? a.text ?? JSON.stringify(a))
    }
  }

  if (typeof text !== 'string') text = String(text)
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`RocketRide returned non-JSON: ${text.slice(0, 200)}`)
  return JSON.parse(match[0])
}

async function extractViaHttp(text, author) {
  const res = await fetch(process.env.ROCKETRIDE_HTTP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.ROCKETRIDE_APIKEY
        ? { Authorization: `Bearer ${process.env.ROCKETRIDE_APIKEY}` }
        : {})
    },
    body: JSON.stringify({ text, author })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`)
  return parseExtractionPayload(data.result ?? data.output ?? data)
}

async function extractViaSdk(text, author) {
  const { RocketRideClient } = await import('rocketride')

  const pipelinePath = process.env.ROCKETRIDE_PIPELINE
    ? resolve(process.cwd(), process.env.ROCKETRIDE_PIPELINE)
    : defaultPipeline

  if (!existsSync(pipelinePath)) {
    throw new Error(`Pipeline not found: ${pipelinePath}`)
  }

  const client = new RocketRideClient({
    uri: process.env.ROCKETRIDE_URI,
    auth: process.env.ROCKETRIDE_APIKEY,
    env: {
      ROCKETRIDE_ANTHROPIC_KEY: process.env.ROCKETRIDE_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY || ''
    }
  })

  await client.connect()
  try {
    const { token } = await client.use({ filepath: pipelinePath })
    try {
      const payload = JSON.stringify({ text, author })
      const result = await client.send(
        token,
        payload,
        { name: 'input.json' },
        'application/json'
      )
      return parseExtractionPayload(result?.body ?? result)
    } finally {
      await client.terminate(token)
    }
  } finally {
    await client.disconnect()
  }
}

export async function extractViaRocketRide(text, author) {
  if (process.env.ROCKETRIDE_HTTP_URL) {
    return extractViaHttp(text, author)
  }
  return extractViaSdk(text, author)
}

export async function checkConnection() {
  if (!isConfigured()) {
    return { ok: false, error: 'Missing ROCKETRIDE_HTTP_URL or ROCKETRIDE_URI + ROCKETRIDE_APIKEY' }
  }

  try {
    if (process.env.ROCKETRIDE_HTTP_URL) {
      return { ok: true, mode: 'http', url: process.env.ROCKETRIDE_HTTP_URL }
    }

    const pipelinePath = process.env.ROCKETRIDE_PIPELINE
      ? resolve(process.cwd(), process.env.ROCKETRIDE_PIPELINE)
      : defaultPipeline

    if (!existsSync(pipelinePath)) {
      return { ok: false, error: `Pipeline file missing: ${pipelinePath}` }
    }

    const { RocketRideClient } = await import('rocketride')
    const client = new RocketRideClient({
      uri: process.env.ROCKETRIDE_URI,
      auth: process.env.ROCKETRIDE_APIKEY
    })
    await client.connect()
    await client.disconnect()
    return { ok: true, mode: 'sdk', uri: process.env.ROCKETRIDE_URI, pipeline: pipelinePath }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}
