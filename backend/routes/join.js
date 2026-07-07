import { Router } from 'express'
import { quickJoinProfile, enrichProfile } from '../agents/ingestion/profile.js'
import { broadcast } from '../lib/butterbase.js'
import { getPersonByUserId } from '../lib/neo4j.js'

const router = Router()

function enrichInBackground(sessionId, payload, author) {
  enrichProfile(sessionId, payload)
    .then(() => broadcast({ type: 'graph_update', author, event: 'enrich', sessionId }))
    .catch(err => console.warn('[join] enrich:', err.message))
}

router.post('/:sessionId/join', async (req, res) => {
  const { sessionId } = req.params
  const { userId, name, github, linkedin } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })
  if (!name) return res.status(400).json({ error: 'name required' })

  try {
    const existing = await getPersonByUserId(sessionId, userId)

    if (existing && !github?.trim() && !linkedin?.trim()) {
      return res.json({
        success: true,
        alreadyJoined: true,
        personId: existing.id,
        skills: existing.skills || [],
        domains: existing.domains || [],
        profile: { name: existing.name }
      })
    }

    const payload = {
      userId,
      name,
      github,
      linkedin,
      personId: existing?.id
    }

    const result = await quickJoinProfile(sessionId, payload)

    broadcast({ type: 'graph_update', author: name, event: 'join', sessionId })
      .catch(err => console.warn('[join] broadcast:', err.message))

    if (github?.trim() || linkedin?.trim()) {
      enrichInBackground(sessionId, { ...payload, personId: result.personId }, name)
    }

    res.json({
      success: true,
      alreadyJoined: Boolean(existing),
      ...result,
      enriching: Boolean(github?.trim() || linkedin?.trim()),
      overlaps: []
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
