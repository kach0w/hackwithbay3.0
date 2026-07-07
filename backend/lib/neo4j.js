import neo4j from 'neo4j-driver'

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

// Contract 1 shape: { nodes, edges }
export async function fetchGraph() {
  const records = await run(`
    MATCH (n)
    OPTIONAL MATCH (n)-[r]->(m)
    RETURN n, r, m
  `)

  const nodesMap = {}
  const edgesMap = {}

  for (const rec of records) {
    const n = rec.get('n')
    if (n && !nodesMap[n.elementId]) {
      nodesMap[n.elementId] = {
        id: n.properties.id || n.elementId,
        type: n.labels[0],
        label: n.properties.name || n.properties.text || '',
        owner: n.properties.owner || null,
        deprecated: n.properties.deprecated || false,
        ts: n.properties.ts ? n.properties.ts.toString() : null
      }
    }
    const m = rec.get('m')
    const r = rec.get('r')
    if (m && !nodesMap[m.elementId]) {
      nodesMap[m.elementId] = {
        id: m.properties.id || m.elementId,
        type: m.labels[0],
        label: m.properties.name || m.properties.text || '',
        owner: m.properties.owner || null,
        deprecated: m.properties.deprecated || false,
        ts: m.properties.ts ? m.properties.ts.toString() : null
      }
    }
    if (r && !edgesMap[r.elementId]) {
      edgesMap[r.elementId] = {
        id: r.elementId,
        source: nodesMap[n.elementId]?.id,
        target: nodesMap[m.elementId]?.id,
        type: r.type,
        deprecated: r.properties.deprecated || false
      }
    }
  }

  return { nodes: Object.values(nodesMap), edges: Object.values(edgesMap) }
}

// Add a new decision about a component
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

// Supersede old decision — retire it, link new one
export async function supersedeDecision({ id, text, component, author }) {
  await run(`
    MATCH (old:Decision)-[:ABOUT]->(c:Component {name: $component})
    WHERE old.deprecated = false
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

// Inference: who owns components that depend on the changed component?
export async function inferAffected(component) {
  const records = await run(`
    MATCH (c:Component {name: $component})<-[:DEPENDS_ON*1..3]-(dep:Component)<-[:OWNS]-(p:Person)
    RETURN DISTINCT p.name AS notify, collect(DISTINCT dep.name) AS affected
  `, { component })

  return records.map(r => ({
    notify: r.get('notify'),
    affected: r.get('affected')
  }))
}

export default driver
