import neo4j from 'neo4j-driver'

// Accept either NEO4J_USER or the NEO4J_USERNAME field that Aura's downloaded
// credentials file uses, so pasting that file into .env just works.
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(
    process.env.NEO4J_USER || process.env.NEO4J_USERNAME,
    process.env.NEO4J_PASSWORD
  )
)

// Aura's file also names the database (often not "neo4j"); honor it if present.
const DATABASE = process.env.NEO4J_DATABASE || undefined

export async function run(cypher, params = {}) {
  const session = driver.session(DATABASE ? { database: DATABASE } : undefined)
  try {
    const result = await session.run(cypher, params)
    return result.records
  } finally {
    await session.close()
  }
}

// Fail loud at startup on a bad URI/password instead of silently at first query.
export async function verifyConnection() {
  await driver.verifyConnectivity()
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

export async function fetchGraph(sessionId) {
  const records = await run(`
    MATCH (n)-[:IN_SESSION]->(s:Session {id: $sessionId})
    OPTIONAL MATCH (n)-[r]->(m)-[:IN_SESSION]->(s)
    RETURN n, r, m
  `, { sessionId })
  return buildGraph(records)
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

export async function addPerson(sessionId, { id, name, github, synthesis, archetype, technical_depth, human_dimension, collaboration_style, strongest_in, curious_about, blind_spots, conversation_topics, skills, domains }) {
  await run(`
    MATCH (s:Session {id: $sessionId})
    MERGE (p:Person {id: $id})
    SET p.name = $name, p.label = $name, p.github = $github,
        p.synthesis = $synthesis, p.archetype = $archetype,
        p.technical_depth = $technical_depth,
        p.human_dimension = $human_dimension,
        p.collaboration_style = $collaboration_style,
        p.strongest_in = $strongest_in,
        p.curious_about = $curious_about,
        p.blind_spots = $blind_spots,
        p.conversation_topics = $conversation_topics,
        p.skills = $skills, p.domains = $domains
    MERGE (p)-[:IN_SESSION]->(s)
  `, {
    sessionId, id, name, github: github || '',
    synthesis: synthesis || '', archetype: archetype || '',
    technical_depth: technical_depth || '',
    human_dimension: human_dimension || '',
    collaboration_style: collaboration_style || '',
    strongest_in: strongest_in || [],
    curious_about: curious_about || [],
    blind_spots: blind_spots || [],
    conversation_topics: conversation_topics || [],
    skills, domains
  })
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
    SET p.name = $author, p.label = $author
    CREATE (d:Decision {id: $id, text: $text, label: $text, ts: datetime(), deprecated: false})
    CREATE (d)-[:IN_SESSION]->(s)
    CREATE (d)-[:ABOUT]->(c)
    CREATE (p)-[:MADE]->(d)
  `, { sessionId, id, text, component, compId: `comp_${component}`, author, authorId: `person_${author.toLowerCase()}` })
}

// Retire the single NEWEST live decision about this component IN THIS SESSION,
// then link the new one. Bounding to one (ORDER BY ts DESC LIMIT 1) and scoping
// `old` to the session prevents (a) deprecating every live decision + creating a
// duplicate new node per match, and (b) touching another session's decisions.
export async function supersedeDecision(sessionId, { id, text, component, author }) {
  await run(`
    MATCH (s:Session {id: $sessionId})
    MATCH (old:Decision)-[:ABOUT]->(c:Component {id: $compId})
    MATCH (old)-[:IN_SESSION]->(s)
    WHERE old.deprecated = false
    WITH s, c, old ORDER BY old.ts DESC LIMIT 1
    SET old.deprecated = true
    WITH s, c, old
    MERGE (p:Person {id: $authorId})-[:IN_SESSION]->(s)
    SET p.name = $author, p.label = $author
    CREATE (new:Decision {id: $id, text: $text, label: $text, ts: datetime(), deprecated: false})
    CREATE (new)-[:IN_SESSION]->(s)
    CREATE (new)-[:ABOUT]->(c)
    CREATE (new)-[:SUPERSEDES]->(old)
    CREATE (p)-[:MADE]->(new)
  `, { sessionId, id, text, component, compId: `comp_${component}`, author, authorId: `person_${author.toLowerCase()}` })
}

// Who owns a component that transitively (1..3 hops) depends on the changed one.
// Returns BOTH ids (for frontend highlight — nodes are keyed person_/comp_) and
// names (for display text). Empty array if nothing depends on it / not seeded.
export async function inferAffected(sessionId, component) {
  const records = await run(`
    MATCH (s:Session {id: $sessionId})
    MATCH (c:Component {id: $compId})<-[:DEPENDS_ON*1..3]-(dep:Component)<-[:OWNS]-(p:Person)
    WHERE (dep)-[:IN_SESSION]->(s)
    RETURN DISTINCT p.id AS notifyId, p.name AS notify,
           collect(DISTINCT dep.id) AS affectedIds, collect(DISTINCT dep.name) AS affected
  `, { sessionId, compId: `comp_${component}` })

  return records.map(r => ({
    notifyId: r.get('notifyId'),
    notify: r.get('notify'),
    affectedIds: r.get('affectedIds'),
    affected: r.get('affected')
  }))
}

// --- Pre-seed --------------------------------------------------------------
// Populate a session so a tab shows a "brain" on login instead of building from
// scratch. Idempotent (MERGE) — safe to re-run before the demo.

// PROJECT tab: people, components, ownership, the dependency web (everything
// depends on user-service so inference fans wide), and one LIVE decision (d_pg)
// that the demo supersede retires. This is what makes inferAffected non-empty.
export async function seedProjectSession(sessionId) {
  await createSession(sessionId)

  await run(`
    MATCH (s:Session {id: $sessionId})
    UNWIND [['person_shreeya','Shreeya'],['person_frank','Frank'],
            ['person_ryan','Ryan'],['person_priya','Priya']] AS pr
    MERGE (p:Person {id: pr[0]}) SET p.name = pr[1], p.label = pr[1]
    MERGE (p)-[:IN_SESSION]->(s)
  `, { sessionId })

  await run(`
    MATCH (s:Session {id: $sessionId})
    UNWIND ['frontend','auth-service','user-service','matching-engine','payments','notifications'] AS cn
    MERGE (c:Component {id: 'comp_' + cn}) SET c.name = cn, c.label = cn
    MERGE (c)-[:IN_SESSION]->(s)
  `, { sessionId })

  await run(`
    UNWIND [['person_shreeya','comp_user-service'],['person_frank','comp_auth-service'],
            ['person_ryan','comp_matching-engine'],['person_priya','comp_payments']] AS o
    MATCH (p:Person {id: o[0]}), (c:Component {id: o[1]})
    MERGE (p)-[:OWNS]->(c)
  `, { sessionId })

  await run(`
    UNWIND [['comp_frontend','comp_auth-service'],['comp_frontend','comp_user-service'],
            ['comp_auth-service','comp_user-service'],['comp_matching-engine','comp_user-service'],
            ['comp_payments','comp_user-service'],['comp_notifications','comp_user-service']] AS d
    MATCH (a:Component {id: d[0]}), (b:Component {id: d[1]})
    MERGE (a)-[:DEPENDS_ON]->(b)
  `, { sessionId })

  await run(`
    MATCH (s:Session {id: $sessionId})
    MATCH (c:Component {id: 'comp_user-service'}), (p:Person {id: 'person_shreeya'})
    MERGE (d:Decision {id: 'd_pg'})
      ON CREATE SET d.text = 'Use Postgres for user-service',
                    d.label = 'Use Postgres for user-service',
                    d.ts = datetime() - duration('PT2H'), d.deprecated = false
    MERGE (d)-[:IN_SESSION]->(s)
    MERGE (d)-[:ABOUT]->(c)
    MERGE (p)-[:MADE]->(d)
  `, { sessionId })
}

// BRAINSTORM tab pre-seed — STARTER, owned by Person A to expand.
// Goal: the brainstorm tab shows a populated team "brain" on entry instead of
// requiring live GitHub/LinkedIn ingestion. Fill in real teammates + overlaps;
// keep it MERGE-based so it stays idempotent. Called only when opted in (the
// seed CLI / a demo toggle), never in the normal live-onboarding flow.
export async function seedBrainstormSession(sessionId) {
  await createSession(sessionId)

  // Example scaffold — replace with the real team. Two people, a shared skill,
  // and one Overlap node so the "meaningful intersection" visual has something.
  await addPerson(sessionId, {
    id: 'person_shreeya', name: 'Shreeya',
    archetype: 'Infra-minded builder', skills: ['Neo4j', 'Node', 'Cypher'],
    domains: ['Developer tools', 'Graphs']
  })
  await addPerson(sessionId, {
    id: 'person_frank', name: 'Frank',
    archetype: 'Full-stack generalist', skills: ['React', 'Node', 'Auth'],
    domains: ['Developer tools', 'Realtime']
  })
  for (const [pid, skills] of [['person_shreeya', ['Neo4j','Node','Cypher']], ['person_frank', ['React','Node','Auth']]]) {
    for (const sk of skills) await addSkillEdge(sessionId, pid, sk)
  }
  for (const [pid, domains] of [['person_shreeya', ['Developer tools','Graphs']], ['person_frank', ['Developer tools','Realtime']]]) {
    for (const dm of domains) await addDomainEdge(sessionId, pid, dm)
  }
  // TODO(Person A): compute/seed Overlap nodes across all members
  // (shared skill "Node", shared domain "Developer tools" → build direction).
}

export default driver
