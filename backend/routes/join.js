import { Router } from 'express'
import { ingestProfile } from '../agents/ingestion/profile.js'
import { broadcast } from '../lib/butterbase.js'

const router = Router()

// POST /session/:id/join { name, github, linkedin, twitter, interests }
router.post('/:sessionId/join', async (req, res) => {
  const { sessionId } = req.params
  const { name, github, linkedin, twitter, interests } = req.body

  if (!name) return res.status(400).json({ error: 'name required' })

  try {
    const result = await ingestProfile(sessionId, { name, github, linkedin, twitter, interests })
    await broadcast({ type: 'graph_update', author: name, event: 'join' })
    res.json({ success: true, ...result })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
