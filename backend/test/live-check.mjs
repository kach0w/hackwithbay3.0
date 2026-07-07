import 'dotenv/config'
import { checkConnection } from '../lib/butterbase.js'
import { verifyConnection, fetchGraph } from '../lib/neo4j.js'
import driver from '../lib/neo4j.js'

const sessionId = process.argv[2] || 'demo'

try {
  await verifyConnection()
  console.log('✓ Neo4j connected')

  const graph = await fetchGraph(sessionId)
  console.log(`✓ session "${sessionId}": ${graph.nodes.length} nodes, ${graph.edges.length} edges`)

  const bb = await checkConnection()
  console.log(bb.ok ? '✓ Butterbase connected' : `✗ Butterbase: ${bb.error}`)
} catch (err) {
  console.error('✗', err.message)
  process.exitCode = 1
} finally {
  await driver.close()
}
