import { Router } from 'express'
import { randomUUID } from 'crypto'
import { createSession } from '../lib/neo4j.js'

const router = Router()

// Create a new session → returns shareable ID
router.post('/', async (req, res) => {
  const sessionId = randomUUID().slice(0, 8)
  await createSession(sessionId)
  res.json({ sessionId })
})

export default router
