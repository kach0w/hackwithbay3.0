import { Router } from 'express'
import { extract, CANNED } from '../agents/extractor.js'
import { addDecision, supersedeDecision, inferAffected } from '../lib/neo4j.js'
import { broadcast } from '../lib/butterbase.js'
import { randomUUID } from 'crypto'

const router = Router()

function pickCannedFallback(text) {
  const lower = text.toLowerCase()
  if (lower.includes('notify') || lower.includes('heads up') || lower.includes('who needs')) {
    return CANNED.notify
  }
  if (lower.includes('supersede') || lower.includes('switch') || (lower.includes('postgres') && lower.includes('neo4j'))) {
    return CANNED.supersede
  }
  return CANNED.add
}

router.post('/:sessionId', async (req, res) => {
  const { sessionId } = req.params
  const { text, author, personId } = req.body
  if (!text || !author || !personId) return res.status(400).json({ error: 'text, author, and personId required' })

  try {
    let extracted
    try {
      extracted = await extract(text, author)
    } catch (err) {
      console.warn('[Event] Extraction failed, using canned fallback:', err.message)
      extracted = { ...pickCannedFallback(text), author }
    }

    const { intent, component } = extracted
    const changed = { nodes: [], edges: [] }
    let affected = []

    if (intent === 'add') {
      const id = `d_${randomUUID().slice(0, 8)}`
      await addDecision(sessionId, { id, text: extracted.text, component, personId })
      changed.nodes.push(id)
    }

    if (intent === 'supersede') {
      const id = `d_${randomUUID().slice(0, 8)}`
      await supersedeDecision(sessionId, { id, text: extracted.text, component, personId })
      changed.nodes.push(id)
    }

    if (intent === 'notify') {
      affected = await inferAffected(sessionId, component)
    }

    await broadcast({ type: 'graph_update', author, intent, component, sessionId })
    res.json({ status: 'ok', intent, changed, affected })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
