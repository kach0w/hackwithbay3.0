import { Router } from 'express'
import { extract } from '../agents/extractor.js'
import { addDecision, supersedeDecision, inferAffected } from '../lib/neo4j.js'
import { broadcast } from '../lib/butterbase.js'
import { randomUUID } from 'crypto'

const router = Router()

// POST /event/:sessionId { text, author }
router.post('/:sessionId', async (req, res) => {
  const { sessionId } = req.params
  const { text, author } = req.body
  if (!text || !author) return res.status(400).json({ error: 'text and author required' })

  try {
    const extracted = await extract(text, author)
    const { intent, component } = extracted
    const changed = { nodes: [], edges: [] }
    let affected = []

    if (intent === 'add') {
      const id = `d_${randomUUID().slice(0, 8)}`
      await addDecision(sessionId, { id, text: extracted.text, component, author })
      changed.nodes.push(id)
    }

    if (intent === 'supersede') {
      const id = `d_${randomUUID().slice(0, 8)}`
      await supersedeDecision(sessionId, { id, text: extracted.text, component, author })
      changed.nodes.push(id)
    }

    if (intent === 'notify') {
      affected = await inferAffected(sessionId, component)
    }

    await broadcast({ type: 'graph_update', author, intent, component })
    res.json({ status: 'ok', intent, changed, affected })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
