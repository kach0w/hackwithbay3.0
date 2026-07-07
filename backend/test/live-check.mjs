// Read-only smoke test against the LIVE Aura DB. Run after filling backend/.env
// and seeding (paste seed.cypher in the Aura Query tab):
//   cd backend && node test/live-check.mjs
// It does NOT mutate data (no supersede) so it's safe to run repeatedly before
// the demo.
import 'dotenv/config'
import driver, { verifyConnection, fetchGraph, inferAffected } from '../lib/neo4j.js'

try {
  await verifyConnection()
  console.log('✓ connected to Neo4j Aura')

  const { nodes, edges } = await fetchGraph()
  console.log(`✓ fetchGraph: ${nodes.length} nodes, ${edges.length} edges`)
  if (nodes.length === 0) {
    console.log('  ⚠ graph is empty — did you paste seed.cypher into the Aura Query tab and run it?')
  }

  const affected = await inferAffected('user-service')
  console.log('✓ inferAffected("user-service") →')
  for (const a of affected) console.log(`    notify ${a.notify}  (affected: ${a.affected.join(', ')})`)
  const names = affected.map(a => a.notify)
  const expected = ['Frank', 'Ryan', 'Priya']
  const missing = expected.filter(n => !names.includes(n))
  console.log(missing.length === 0
    ? '✓ inference returns Frank, Ryan, Priya'
    : `  ⚠ expected Frank/Ryan/Priya, missing: ${missing.join(', ')}`)
} catch (err) {
  console.error('✗ live check failed:', err.message)
  process.exitCode = 1
} finally {
  await driver.close()
}
