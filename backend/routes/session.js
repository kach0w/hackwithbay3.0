import { Router } from 'express'
import { randomUUID } from 'crypto'
import { createSession, seedProjectSession } from '../lib/neo4j.js'

const router = Router()

router.post('/', async (req, res) => {
  try {
    const sessionId = randomUUID().slice(0, 8)
    await createSession(sessionId)
    await seedProjectSession(sessionId)
    res.json({ sessionId })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export default router
