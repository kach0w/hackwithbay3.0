import neo4j from 'neo4j-driver'

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(
    process.env.NEO4J_USER || process.env.NEO4J_USERNAME,
    process.env.NEO4J_PASSWORD
  )
)

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

export async function verifyConnection() {
  await driver.verifyConnectivity()
}

export async function createSession(sessionId) {
  await run(`MERGE (s:Session {id: $sessionId})`, { sessionId })
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
    summary: p.summary || null,
    archetype: p.archetype || null,
    synthesis: p.synthesis || null,
    technical_depth: p.technical_depth || null,
    human_dimension: p.human_dimension || null,
    collaboration_style: p.collaboration_style || null,
    strongest_in: p.strongest_in || [],
    curious_about: p.curious_about || [],
    blind_spots: p.blind_spots || [],
    conversation_topics: p.conversation_topics || [],
    intersection: p.intersection || null,
    build_direction: p.build_direction || null,
    strength: p.strength ?? null
  }
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

export async function getPersonByUserId(sessionId, userId) {
  const records = await run(`
    MATCH (p:Person)-[:IN_SESSION]->(s:Session {id: $sessionId})
    WHERE p.butterbase_user_id = $userId
    RETURN p
  `, { sessionId, userId })
  if (!records.length) return null
  return records[0].get('p').properties
}

export async function addPerson(sessionId, { id, userId, name, github, synthesis, archetype, technical_depth, human_dimension, collaboration_style, strongest_in, curious_about, blind_spots, conversation_topics, skills, domains }) {
  await run(`
    MATCH (s:Session {id: $sessionId})
    MERGE (p:Person {id: $id})
    SET p.butterbase_user_id = $userId,
        p.name = $name, p.label = $name, p.github = $github,
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
    sessionId, id, userId: userId || '', name, github: github || '',
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

export const CANONICAL_COMPONENTS = ['frontend', 'auth-service', 'user-service', 'matching-engine', 'payments', 'notifications']

export function normalizeComponent(raw) {
  if (!raw) return raw
  const slug = String(raw).toLowerCase().trim().replace(/[\s_]+/g, '-')
  if (CANONICAL_COMPONENTS.includes(slug)) return slug
  const compact = slug.replace(/-/g, '')
  return CANONICAL_COMPONENTS.find(c => {
    const cc = c.replace(/-/g, '')
    return compact === cc || compact.includes(cc)
  }) || slug
}

export async function addDecision(sessionId, { id, text, component, personId }) {
  component = normalizeComponent(component)
  await run(`
    MATCH (s:Session {id: $sessionId})
    MERGE (c:Component {id: $compId})-[:IN_SESSION]->(s)
    SET c.name = $component, c.label = $component
    MATCH (p:Person {id: $personId})-[:IN_SESSION]->(s)
    CREATE (d:Decision {id: $id, text: $text, label: $text, ts: datetime(), deprecated: false})
    CREATE (d)-[:IN_SESSION]->(s)
    CREATE (d)-[:ABOUT]->(c)
    CREATE (p)-[:MADE]->(d)
  `, { sessionId, id, text, component, compId: `comp_${component}`, personId })
}

export async function supersedeDecision(sessionId, { id, text, component, personId }) {
  component = normalizeComponent(component)
  await run(`
    MATCH (s:Session {id: $sessionId})
    MATCH (old:Decision)-[:ABOUT]->(c:Component {id: $compId})
    MATCH (old)-[:IN_SESSION]->(s)
    WHERE old.deprecated = false
    WITH s, c, old ORDER BY old.ts DESC LIMIT 1
    SET old.deprecated = true
    WITH s, c, old
    MATCH (p:Person {id: $personId})-[:IN_SESSION]->(s)
    CREATE (new:Decision {id: $id, text: $text, label: $text, ts: datetime(), deprecated: false})
    CREATE (new)-[:IN_SESSION]->(s)
    CREATE (new)-[:ABOUT]->(c)
    CREATE (new)-[:SUPERSEDES]->(old)
    CREATE (p)-[:MADE]->(new)
  `, { sessionId, id, text, component, compId: `comp_${component}`, personId })
}

export async function inferAffected(sessionId, component) {
  component = normalizeComponent(component)
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

export async function seedBrainstormSession(sessionId) {
  await createSession(sessionId)

  const team = [
    { id: 'person_shreeya', name: 'Shreeya', archetype: 'Infra-minded graph builder',
      synthesis: 'Backend/infra engineer who thinks in graphs and data models.',
      strongest_in: ['Neo4j', 'Cypher', 'Backend'], curious_about: ['Realtime systems', 'Agents'],
      skills: ['Neo4j', 'Node', 'Cypher', 'Backend'], domains: ['Developer tools', 'Graphs'] },
    { id: 'person_frank', name: 'Frank', archetype: 'Full-stack generalist',
      synthesis: 'Ships end-to-end features fast; comfortable across the whole stack.',
      strongest_in: ['React', 'Node', 'Auth'], curious_about: ['Graph UX', 'Realtime'],
      skills: ['React', 'Node', 'Auth', 'APIs'], domains: ['Developer tools', 'Realtime'] },
    { id: 'person_ryan', name: 'Ryan', archetype: 'ML / matching systems',
      synthesis: 'Builds ranking and matching engines; likes messy real-world data.',
      strongest_in: ['Python', 'ML', 'Ranking'], curious_about: ['Graph algorithms', 'Recommendations'],
      skills: ['Python', 'ML', 'Ranking', 'Data'], domains: ['Matching', 'Data'] },
    { id: 'person_priya', name: 'Priya', archetype: 'Payments & product',
      synthesis: 'Owns payments/marketplace flows; bridges product and engineering.',
      strongest_in: ['Payments', 'Product', 'TypeScript'], curious_about: ['Marketplaces', 'Trust & safety'],
      skills: ['Payments', 'TypeScript', 'Product'], domains: ['Fintech', 'Marketplaces'] },
  ]

  for (const p of team) {
    await addPerson(sessionId, p)
    for (const sk of p.skills) await addSkillEdge(sessionId, p.id, sk)
    for (const dm of p.domains) await addDomainEdge(sessionId, p.id, dm)
  }

  const overlaps = [
    { id: 'ov_graph_realtime', people: ['Shreeya', 'Frank'], label: 'Graph + Realtime', strength: 5,
      intersection: 'Both live in developer tools — one models the graph, the other makes it feel live.',
      build_direction: 'A collaborative graph that updates on every teammate action in realtime.' },
    { id: 'ov_matching_payments', people: ['Ryan', 'Priya'], label: 'Matching → Marketplace', strength: 4,
      intersection: 'Ranking expertise meets payments and marketplace ownership.',
      build_direction: 'A two-sided marketplace where good matches convert straight into paid transactions.' },
    { id: 'ov_full_group', people: ['Shreeya', 'Frank', 'Ryan', 'Priya'], label: 'Full-stack graph product', strength: 5,
      intersection: 'Graph infra + full-stack + ML matching + payments covers a whole product with no gaps.',
      build_direction: 'Ship a graph-native product with realtime UX, smart matching, and payments end to end.' },
  ]

  for (const o of overlaps) {
    await run(`
      MATCH (s:Session {id: $sessionId})
      MERGE (ov:Overlap {id: $id})-[:IN_SESSION]->(s)
      SET ov.label = $label, ov.intersection = $intersection,
          ov.build_direction = $build_direction, ov.strength = $strength
    `, { sessionId, id: o.id, label: o.label, intersection: o.intersection, build_direction: o.build_direction, strength: o.strength })
    for (const personName of o.people) {
      await run(`
        MATCH (p:Person)-[:IN_SESSION]->(s:Session {id: $sessionId})
        WHERE toLower(p.name) = toLower($personName)
        MATCH (ov:Overlap {id: $overlapId})-[:IN_SESSION]->(s)
        MERGE (p)-[:OVERLAPS_WITH]->(ov)
      `, { sessionId, personName, overlapId: o.id })
    }
  }
}

export default driver
