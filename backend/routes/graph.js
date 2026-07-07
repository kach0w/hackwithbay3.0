import { Router } from 'express'
import { fetchBrainstormGraph, fetchProjectGraph } from '../lib/neo4j.js'
import { computeOverlaps } from '../agents/ingestion/overlap.js'

const router = Router()

router.get('/brainstorm/:sessionId', async (req, res) => {
  try {
    const graph = await fetchBrainstormGraph(req.params.sessionId)
    res.json(graph)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/project/:sessionId', async (req, res) => {
  try {
    const graph = await fetchProjectGraph(req.params.sessionId)
    res.json(graph)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Recompute overlaps on demand
router.post('/brainstorm/:sessionId/overlaps', async (req, res) => {
  try {
    const overlaps = await computeOverlaps(req.params.sessionId)
    res.json({ overlaps })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
