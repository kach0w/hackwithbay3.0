import { Router } from 'express'
import { fetchGraph } from '../lib/neo4j.js'

const router = Router()

// Contract 1
router.get('/', async (req, res) => {
  try {
    const graph = await fetchGraph()
    res.json(graph)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
