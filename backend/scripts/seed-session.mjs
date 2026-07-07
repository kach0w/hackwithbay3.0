import 'dotenv/config'
import driver, { seedProjectSession, seedBrainstormSession } from '../lib/neo4j.js'

const sessionId = process.argv[2] || 'demo'
const what = process.argv[3] || 'project'

try {
  if (what === 'project' || what === 'both') {
    await seedProjectSession(sessionId)
    console.log(`✓ seeded PROJECT graph into session "${sessionId}"`)
  }
  if (what === 'brainstorm' || what === 'both') {
    await seedBrainstormSession(sessionId)
    console.log(`✓ seeded BRAINSTORM starter into session "${sessionId}"`)
  }
} catch (err) {
  console.error('✗ seed failed:', err.message)
  process.exitCode = 1
} finally {
  await driver.close()
}
