import { Router } from 'express'
import { fetchGraph } from '../lib/neo4j.js'

const router = Router()

// GET /graph/:sessionId
router.get('/:sessionId', async (req, res) => {
  try {
    const graph = await fetchGraph(req.params.sessionId)
    res.json(graph)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
