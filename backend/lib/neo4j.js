import neo4j from 'neo4j-driver'
import { flattenGraph } from './graph-shape.js'

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
)

async function run(cypher, params = {}) {
  const session = driver.session()
  try {
    const result = await session.run(cypher, params)
    return result.records
  } finally {
    await session.close()
  }
}

// Verify the connection at startup so a bad Aura URI/password fails loud, not
// silently at the first /graph request during the demo.
export async function verifyConnection() {
  await driver.verifyConnectivity()
}

// Contract 1: { nodes, edges }
export async function fetchGraph() {
  const records = await run(`
    MATCH (n)
    OPTIONAL MATCH (n)-[r]->(m)
    RETURN n, r, m
  `)
  return flattenGraph(records)
}

// Add a new decision about a component (no conflict / nothing to retire).
export async function addDecision({ id, text, component, author }) {
  await run(`
    MATCH (c:Component {name: $component})
    MATCH (p:Person {name: $author})
    CREATE (d:Decision {id: $id, text: $text, ts: datetime(), deprecated: false})
    CREATE (d)-[:ABOUT]->(c)
    CREATE (p)-[:MADE]->(d)
    RETURN d
  `, { id, text, component, author })
}

// Supersede: retire the single newest live decision about the component and
// link the new one with SUPERSEDES. Bounding to the newest (ORDER BY ts DESC
// LIMIT 1) means that even if the graph somehow holds >1 live decision, we
// retire one and create exactly one new node (no duplicate-id blowup).
export async function supersedeDecision({ id, text, component, author }) {
  await run(`
    MATCH (old:Decision)-[:ABOUT]->(c:Component {name: $component})
    WHERE old.deprecated = false
    WITH old, c
    ORDER BY old.ts DESC
    LIMIT 1
    SET old.deprecated = true
    WITH old, c
    MATCH (p:Person {name: $author})
    CREATE (new:Decision {id: $id, text: $text, ts: datetime(), deprecated: false})
    CREATE (new)-[:ABOUT]->(c)
    CREATE (new)-[:SUPERSEDES]->(old)
    CREATE (p)-[:MADE]->(new)
    RETURN new, old
  `, { id, text, component, author })
}

// Inference: who owns a component that transitively (1..3 hops) depends on the
// changed component. Returns [{ notify, affected }] where notify is a person
// name and affected is the list of their impacted component names.
export async function inferAffected(component) {
  const records = await run(`
    MATCH (c:Component {name: $component})<-[:DEPENDS_ON*1..3]-(dep:Component)<-[:OWNS]-(p:Person)
    RETURN DISTINCT p.name AS notify, collect(DISTINCT dep.name) AS affected
  `, { component })

  return records.map(r => ({
    notify: r.get('notify'),
    affected: r.get('affected'),
  }))
}

export default driver
