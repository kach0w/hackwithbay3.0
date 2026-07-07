import { Router } from 'express'
import { ingestProfile } from '../agents/ingestion/profile.js'
import { computeOverlaps } from '../agents/ingestion/overlap.js'
import { broadcast } from '../lib/butterbase.js'

const router = Router()

router.post('/:sessionId/join', async (req, res) => {
  const { sessionId } = req.params
  const { name, github, linkedin, website, interests } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })

  try {
    const result = await ingestProfile(sessionId, { name, github, linkedin, website, interests })

    // Recompute overlaps after every new person joins
    const overlaps = await computeOverlaps(sessionId).catch(() => [])

    await broadcast({ type: 'graph_update', author: name, event: 'join' })
    res.json({ success: true, ...result, overlaps })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
