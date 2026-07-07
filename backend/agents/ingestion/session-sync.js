import { run } from '../../lib/neo4j.js'
import { computeOverlaps } from './overlap.js'
import { broadcast } from '../../lib/butterbase.js'

export async function countSessionMembers(sessionId) {
  const records = await run(`
    MATCH (p:Person)-[:IN_SESSION]->(s:Session {id: $sessionId})
    WHERE p.butterbase_user_id IS NOT NULL AND p.butterbase_user_id <> ''
    RETURN count(p) AS n
  `, { sessionId })
  return records[0]?.get('n')?.toNumber?.() ?? Number(records[0]?.get('n')) ?? 0
}

/** Map ingested skills to canonical stack ownership so PROJECT isn't empty. */
export async function assignSkillOwnership(sessionId) {
  const records = await run(`
    MATCH (p:Person)-[:IN_SESSION]->(s:Session {id: $sessionId})
    WHERE p.butterbase_user_id IS NOT NULL AND p.butterbase_user_id <> ''
    RETURN p.id AS id, p.skills AS skills
  `, { sessionId })

  const rules = [
    { re: /react|vue|svelte|frontend|vite|next|tailwind/i, comp: 'comp_frontend' },
    { re: /auth|oauth|clerk|jwt|passport/i, comp: 'comp_auth-service' },
    { re: /postgres|neo4j|graphql|redis|prisma|database/i, comp: 'comp_user-service' },
    { re: /machine learning|pytorch|tensorflow|llm|matching|graph/i, comp: 'comp_matching-engine' },
    { re: /stripe|payment|billing/i, comp: 'comp_payments' },
    { re: /notification|email|twilio|sms/i, comp: 'comp_notifications' }
  ]

  for (const rec of records) {
    const personId = rec.get('id')
    const blob = (rec.get('skills') || []).join(' ').toLowerCase()
    for (const { re, comp } of rules) {
      if (!re.test(blob)) continue
      await run(`
        MATCH (p:Person {id: $personId}), (c:Component {id: $comp})
        MERGE (p)-[:OWNS]->(c)
      `, { personId, comp })
    }
  }
}

export async function bridgeOverlapsToProject(sessionId) {
  const records = await run(`
    MATCH (ov:Overlap)-[:IN_SESSION]->(s:Session {id: $sessionId})
    OPTIONAL MATCH (p:Person)-[:OVERLAPS_WITH]->(ov)
    WHERE (p)-[:IN_SESSION]->(s)
    RETURN ov.id AS id, ov.label AS label, ov.intersection AS intersection,
           ov.build_direction AS build_direction, ov.strength AS strength,
           collect(DISTINCT p.id) AS personIds, collect(DISTINCT p.name) AS names
    ORDER BY ov.strength DESC
  `, { sessionId })

  let bridged = 0
  for (const rec of records) {
    const id = rec.get('id')
    const label = rec.get('label')
    const intersection = rec.get('intersection')
    const buildDirection = rec.get('build_direction')
    const personIds = rec.get('personIds') || []
    const names = rec.get('names') || []
    if (!id || !buildDirection || !personIds.length) continue

    const compId = `comp_overlap_${id}`
    const decId = `d_overlap_${id}`
    const compSlug = String(label || id).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)

    await run(`
      MATCH (s:Session {id: $sessionId})
      MERGE (c:Component {id: $compId})-[:IN_SESSION]->(s)
      SET c.name = $compSlug, c.label = $label
      MERGE (d:Decision {id: $decId})-[:IN_SESSION]->(s)
      SET d.text = $buildDirection, d.label = $buildDirection,
          d.ts = datetime(), d.deprecated = false
      MERGE (d)-[:ABOUT]->(c)
      WITH s, c, d
      UNWIND $personIds AS pid
      MATCH (p:Person {id: pid})-[:IN_SESSION]->(s)
      MERGE (p)-[:OWNS]->(c)
      MERGE (p)-[:MADE]->(d)
    `, {
      sessionId,
      compId,
      compSlug,
      label: label || 'Team overlap',
      decId,
      buildDirection,
      personIds
    })

    // Link overlap focus to core stack so dependency traversal works in demo
    await run(`
      MATCH (focus:Component {id: $compId}), (core:Component {id: 'comp_user-service'})
      MERGE (focus)-[:DEPENDS_ON]->(core)
    `, { compId })

    console.log(`[ProjectBridge] ${names.join(' + ')} → ${label}`)
    bridged++
  }

  return bridged
}

/** After profile enrich: auto overlap + project bridge when 2+ members. */
export async function maybeAutoComputeSession(sessionId, author = 'system') {
  const n = await countSessionMembers(sessionId)
  if (n < 2) {
    console.log(`[SessionSync] ${n} member(s) — waiting for teammate before overlaps`)
    return { members: n, overlaps: 0, bridged: 0 }
  }

  const overlaps = await computeOverlaps(sessionId)
  await assignSkillOwnership(sessionId)
  const bridged = await bridgeOverlapsToProject(sessionId)
  await broadcast({ type: 'graph_update', author, intent: 'overlaps', sessionId })
  console.log(`[SessionSync] ${overlaps.length} overlaps, ${bridged} bridged to project`)
  return { members: n, overlaps: overlaps.length, bridged }
}
