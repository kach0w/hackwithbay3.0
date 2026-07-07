import { Router } from 'express'
import { ingestProfile } from '../agents/ingestion/profile.js'
import { computeOverlaps } from '../agents/ingestion/overlap.js'
import { broadcast } from '../lib/butterbase.js'
import { getPersonByUserId } from '../lib/neo4j.js'

const router = Router()

router.post('/:sessionId/join', async (req, res) => {
  const { sessionId } = req.params
  const { userId, name, github, linkedin, website, interests } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })
  if (!name) return res.status(400).json({ error: 'name required' })

  try {
    const existing = await getPersonByUserId(sessionId, userId)
    if (existing) {
      return res.json({
        success: true,
        alreadyJoined: true,
        personId: existing.id,
        skills: existing.skills || [],
        domains: existing.domains || [],
        profile: { name: existing.name }
      })
    }

    const result = await ingestProfile(sessionId, { userId, name, github, linkedin, website, interests })
    const overlaps = await computeOverlaps(sessionId).catch(() => [])

    await broadcast({ type: 'graph_update', author: name, event: 'join' })
    res.json({ success: true, ...result, overlaps })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
