import neo4j from 'neo4j-driver'

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
)

export async function run(cypher, params = {}) {
  const session = driver.session()
  try {
    const result = await session.run(cypher, params)
    return result.records
  } finally {
    await session.close()
  }
}

export async function createSession(sessionId) {
  await run(`MERGE (s:Session {id: $sessionId})`, { sessionId })
}

function buildGraph(records) {
  const nodesMap = {}
  const edgesMap = {}

  for (const rec of records) {
    const n = rec.get('n')
    const m = rec.get('m')
    const r = rec.get('r')
    if (n && !nodesMap[n.elementId]) nodesMap[n.elementId] = shapeNode(n)
    if (m && !nodesMap[m.elementId]) nodesMap[m.elementId] = shapeNode(m)
    if (r && !edgesMap[r.elementId]) {
      edgesMap[r.elementId] = {
        id: r.elementId,
        source: nodesMap[n.elementId]?.id,
        target: nodesMap[m?.elementId]?.id,
        type: r.type,
        deprecated: r.properties.deprecated || false
      }
    }
  }

  return {
    nodes: Object.values(nodesMap).filter(n => n.id),
    edges: Object.values(edgesMap).filter(e => e.source && e.target)
  }
}

export async function fetchGraph(sessionId) {
  const records = await run(`
    MATCH (n)-[:IN_SESSION]->(s:Session {id: $sessionId})
    OPTIONAL MATCH (n)-[r]->(m)-[:IN_SESSION]->(s)
    RETURN n, r, m
  `, { sessionId })

  const nodesMap = {}
  const edgesMap = {}

  for (const rec of records) {
    const n = rec.get('n')
    const m = rec.get('m')
    const r = rec.get('r')

    if (n && !nodesMap[n.elementId]) {
      nodesMap[n.elementId] = shapeNode(n)
    }
    if (m && !nodesMap[m.elementId]) {
      nodesMap[m.elementId] = shapeNode(m)
    }
    if (r && !edgesMap[r.elementId]) {
      edgesMap[r.elementId] = {
        id: r.elementId,
        source: nodesMap[n.elementId]?.id,
        target: nodesMap[m?.elementId]?.id,
        type: r.type,
        deprecated: r.properties.deprecated || false
      }
    }
  }

  return {
    nodes: Object.values(nodesMap).filter(n => n.id),
    edges: Object.values(edgesMap).filter(e => e.source && e.target)
  }
}

function shapeNode(n) {
  const p = n.properties
  return {
    id: p.id || n.elementId,
    type: n.labels.find(l => l !== 'Session') || n.labels[0],
    label: p.name || p.text || p.label || '',
    owner: p.owner || null,
    deprecated: p.deprecated || false,
    ts: p.ts ? p.ts.toString() : null,
    skills: p.skills || [],
    domains: p.domains || [],
    github: p.github || null,
    summary: p.summary || null
  }
}

export async function addPerson(sessionId, { id, name, github, synthesis, archetype, strongest_in, curious_about, working_style, skills, domains }) {
  await run(`
    MATCH (s:Session {id: $sessionId})
    MERGE (p:Person {id: $id})
    SET p.name = $name, p.github = $github,
        p.synthesis = $synthesis, p.archetype = $archetype,
        p.strongest_in = $strongest_in, p.curious_about = $curious_about,
        p.working_style = $working_style,
        p.skills = $skills, p.domains = $domains,
        p.label = $name
    MERGE (p)-[:IN_SESSION]->(s)
  `, { sessionId, id, name, github: github || '', synthesis: synthesis || '',
       archetype: archetype || '', strongest_in: strongest_in || [],
       curious_about: curious_about || [], working_style: working_style || '',
       skills, domains })
}

export async function fetchBrainstormGraph(sessionId) {
  const records = await run(`
    MATCH (n)-[:IN_SESSION]->(s:Session {id: $sessionId})
    WHERE n:Person OR n:Skill OR n:Domain OR n:Overlap
    OPTIONAL MATCH (n)-[r]->(m)-[:IN_SESSION]->(s)
    WHERE m:Person OR m:Skill OR m:Domain OR m:Overlap
    RETURN n, r, m
  `, { sessionId })
  return buildGraph(records)
}

export async function fetchProjectGraph(sessionId) {
  const records = await run(`
    MATCH (n)-[:IN_SESSION]->(s:Session {id: $sessionId})
    WHERE n:Person OR n:Component OR n:Decision
    OPTIONAL MATCH (n)-[r]->(m)
    WHERE (m)-[:IN_SESSION]->(s) AND (m:Person OR m:Component OR m:Decision)
    RETURN n, r, m
  `, { sessionId })
  return buildGraph(records)
}

export async function addSkillEdge(sessionId, personId, skillName) {
  await run(`
    MATCH (s:Session {id: $sessionId})
    MATCH (p:Person {id: $personId})-[:IN_SESSION]->(s)
    MERGE (sk:Skill {id: $skillId})-[:IN_SESSION]->(s)
    SET sk.name = $skillName, sk.label = $skillName
    MERGE (p)-[:HAS_SKILL]->(sk)
  `, { sessionId, personId, skillId: `skill_${skillName.toLowerCase().replace(/\s+/g,'_')}`, skillName })
}

export async function addDomainEdge(sessionId, personId, domainName) {
  await run(`
    MATCH (s:Session {id: $sessionId})
    MATCH (p:Person {id: $personId})-[:IN_SESSION]->(s)
    MERGE (d:Domain {id: $domainId})-[:IN_SESSION]->(s)
    SET d.name = $domainName, d.label = $domainName
    MERGE (p)-[:INTERESTED_IN]->(d)
  `, { sessionId, personId, domainId: `domain_${domainName.toLowerCase().replace(/\s+/g,'_')}`, domainName })
}

export async function addDecision(sessionId, { id, text, component, author }) {
  await run(`
    MATCH (s:Session {id: $sessionId})
    MERGE (c:Component {id: $compId})-[:IN_SESSION]->(s)
    SET c.name = $component, c.label = $component
    MERGE (p:Person {id: $authorId})-[:IN_SESSION]->(s)
    SET p.name = $author
    CREATE (d:Decision {id: $id, text: $text, label: $text, ts: datetime(), deprecated: false})
    CREATE (d)-[:IN_SESSION]->(s)
    CREATE (d)-[:ABOUT]->(c)
    CREATE (p)-[:MADE]->(d)
  `, { sessionId, id, text, component, compId: `comp_${component}`, author, authorId: `person_${author.toLowerCase()}` })
}

export async function supersedeDecision(sessionId, { id, text, component, author }) {
  await run(`
    MATCH (s:Session {id: $sessionId})
    MATCH (old:Decision)-[:ABOUT]->(c:Component {id: $compId})
    WHERE old.deprecated = false
    SET old.deprecated = true
    WITH old, c, s
    MERGE (p:Person {id: $authorId})-[:IN_SESSION]->(s)
    SET p.name = $author
    CREATE (new:Decision {id: $id, text: $text, label: $text, ts: datetime(), deprecated: false})
    CREATE (new)-[:IN_SESSION]->(s)
    CREATE (new)-[:ABOUT]->(c)
    CREATE (new)-[:SUPERSEDES]->(old)
    CREATE (p)-[:MADE]->(new)
  `, { sessionId, id, text, component, compId: `comp_${component}`, author, authorId: `person_${author.toLowerCase()}` })
}

export async function inferAffected(sessionId, component) {
  const records = await run(`
    MATCH (s:Session {id: $sessionId})
    MATCH (c:Component {id: $compId})<-[:DEPENDS_ON*1..3]-(dep:Component)<-[:OWNS]-(p:Person)
    WHERE (dep)-[:IN_SESSION]->(s)
    RETURN DISTINCT p.name AS notify, collect(DISTINCT dep.name) AS affected
  `, { sessionId, compId: `comp_${component}` })

  return records.map(r => ({ notify: r.get('notify'), affected: r.get('affected') }))
}

export default driver
