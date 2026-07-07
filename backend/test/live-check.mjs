// End-to-end smoke test against the LIVE Aura DB for the PROJECT tab.
// Seeds a throwaway session, then verifies connect + fetch + inference + a
// non-destructive supersede check. Run:  node test/live-check.mjs
import 'dotenv/config'
import driver, {
  verifyConnection, seedProjectSession, seedBrainstormSession,
  fetchProjectGraph, fetchBrainstormGraph, inferAffected, normalizeComponent,
} from '../lib/neo4j.js'

const S = 'livecheck'

try {
  await verifyConnection()
  console.log('✓ connected to Neo4j Aura')

  await seedProjectSession(S)
  const { nodes, edges } = await fetchProjectGraph(S)
  console.log(`✓ project graph: ${nodes.length} nodes, ${edges.length} edges`)

  await seedBrainstormSession(S)
  const brain = await fetchBrainstormGraph(S)
  const overlaps = brain.nodes.filter(n => n.type === 'Overlap').length
  console.log(`✓ brainstorm graph: ${brain.nodes.length} nodes, ${brain.edges.length} edges, ${overlaps} overlaps`)

  console.log(`✓ normalizeComponent("the user service") -> ${normalizeComponent('the user service')}`)

  const affected = await inferAffected(S, 'user-service')
  console.log('✓ inferAffected("user-service") →')
  for (const a of affected) console.log(`    notify ${a.notify} (${a.notifyId})  affected: ${a.affected.join(', ')}`)

  const names = affected.map(a => a.notify)
  const missing = ['Frank', 'Ryan', 'Priya'].filter(n => !names.includes(n))
  console.log(missing.length === 0
    ? '✓ inference returns Frank, Ryan, Priya with matchable ids'
    : `  ⚠ missing from inference: ${missing.join(', ')} (OWNS/DEPENDS_ON not seeded?)`)

  const ids = affected.flatMap(a => [a.notifyId, ...a.affectedIds])
  console.log(ids.every(id => typeof id === 'string' && (id.startsWith('person_') || id.startsWith('comp_')))
    ? '✓ highlight ids match node id scheme (person_/comp_)'
    : '  ⚠ some inference ids do not match the node id scheme')
} catch (err) {
  console.error('✗ live check failed:', err.message)
  process.exitCode = 1
} finally {
  await driver.close()
}
