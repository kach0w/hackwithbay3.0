import { Router } from 'express'
import { extract } from '../agents/extractor.js'
import { addDecision, supersedeDecision, inferAffected } from '../lib/neo4j.js'
import { broadcast } from '../lib/butterbase.js'
import { randomUUID } from 'crypto'

const router = Router()

// Contract 2: POST /event { text, author }
router.post('/', async (req, res) => {
  const { text, author } = req.body
  if (!text || !author) return res.status(400).json({ error: 'text and author required' })

  try {
    // Contract 4: extraction
    const extracted = await extract(text, author)
    const { intent, component, tech } = extracted

    const changed = { nodes: [], edges: [] }
    let affected = []

    if (intent === 'add') {
      const id = `d_${randomUUID().slice(0, 8)}`
      await addDecision({ id, text: extracted.text, component, author })
      changed.nodes.push(id)
    }

    if (intent === 'supersede') {
      const id = `d_${randomUUID().slice(0, 8)}`
      await supersedeDecision({ id, text: extracted.text, component, author })
      changed.nodes.push(id)
    }

    if (intent === 'notify') {
      affected = await inferAffected(component)
    }

    // Contract 3: broadcast to all clients
    await broadcast({ type: 'graph_update', author, intent, component })

    res.json({ status: 'ok', intent, changed, affected })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
