import Anthropic from '@anthropic-ai/sdk'
import { run } from '../../lib/neo4j.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function parseDigest(raw) {
  if (!raw) return []
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function sharedSkillOverlaps(people) {
  const overlaps = []
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i]
      const b = people[j]
      const skillsA = new Set((a.skills || []).map(s => s.toLowerCase()))
      const shared = (b.skills || []).filter(s => skillsA.has(s.toLowerCase()))
      if (shared.length < 2) continue

      const id = `ov_shared_${a.name}_${b.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 48)
      overlaps.push({
        id,
        people: [a.name, b.name],
        label: `${shared.slice(0, 2).join(' + ')} stack`,
        intersection: `${a.name} and ${b.name} both ship with ${shared.join(', ')}.`,
        build_direction: `Build on shared ${shared[0]} experience — ${shared.join(', ')}.`,
        strength: Math.min(5, shared.length + 1)
      })
    }
  }
  return overlaps
}

function projectContextBlock(person) {
  const projects = parseDigest(person.project_digest)
  if (!projects.length) return ''
  return projects.slice(0, 6).map(p => {
    const readme = p.readme ? `\n  README: ${p.readme.slice(0, 500)}` : ''
    return `- ${p.name}: ${p.description || '(no description)'}${readme}`
  }).join('\n')
}

async function claudeOverlaps(people) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: `You find meaningful overlaps between builders from their ACTUAL GitHub projects and READMEs.
Match on shared project themes, complementary skills, and what they could build together.
Do NOT only match generic tags like "web" or "Python" — find specific commonalities from README content.
Return JSON only.`,
    messages: [{
      role: 'user',
      content: `Find overlaps between these team members from their real project work.

${people.map(p => `
NAME: ${p.name}
SYNTHESIS: ${p.synthesis}
SKILLS: ${(p.skills || []).join(', ')}
DOMAINS: ${(p.domains || []).join(', ')}
RECENT PROJECTS (from GitHub READMEs):
${projectContextBlock(p) || '(none)'}
`).join('\n---\n')}

Return JSON:
{
  "overlaps": [
    {
      "id": "unique_slug",
      "people": ["name1", "name2"],
      "label": "short label",
      "intersection": "specific shared theme from their repos/READMEs",
      "build_direction": "concrete thing to build together",
      "strength": 1-5
    }
  ]
}`
    }]
  })

  const match = response.content[0].text.match(/\{[\s\S]*\}/)
  if (!match) return []
  const { overlaps } = JSON.parse(match[0])
  return Array.isArray(overlaps) ? overlaps : []
}

async function writeOverlaps(sessionId, overlaps) {
  for (const overlap of overlaps) {
    await run(`
      MATCH (s:Session {id: $sessionId})
      MERGE (o:Overlap {id: $id})-[:IN_SESSION]->(s)
      SET o.label = $label, o.intersection = $intersection,
          o.build_direction = $build_direction, o.strength = $strength
    `, {
      sessionId,
      id: overlap.id,
      label: overlap.label,
      intersection: overlap.intersection,
      build_direction: overlap.build_direction,
      strength: overlap.strength ?? 3
    })

    for (const personName of overlap.people || []) {
      await run(`
        MATCH (p:Person)-[:IN_SESSION]->(s:Session {id: $sessionId})
        WHERE toLower(p.name) = toLower($personName)
        MATCH (o:Overlap {id: $overlapId})-[:IN_SESSION]->(s)
        MERGE (p)-[:OVERLAPS_WITH]->(o)
      `, { sessionId, personName, overlapId: overlap.id })
    }
  }
}

export async function computeOverlaps(sessionId) {
  const records = await run(`
    MATCH (p:Person)-[:IN_SESSION]->(s:Session {id: $sessionId})
    WHERE p.butterbase_user_id IS NOT NULL AND p.butterbase_user_id <> ''
    RETURN p.name AS name, p.synthesis AS synthesis, p.archetype AS archetype,
           p.strongest_in AS strongest_in, p.curious_about AS curious_about,
           p.skills AS skills, p.domains AS domains, p.project_digest AS project_digest
  `, { sessionId })

  const people = records.map(r => r.toObject())
  if (people.length < 2) return []

  // Clear stale overlaps before recompute
  await run(`
    MATCH (s:Session {id: $sessionId})
    OPTIONAL MATCH (o:Overlap)-[:IN_SESSION]->(s)
    DETACH DELETE o
  `, { sessionId })

  const deterministic = sharedSkillOverlaps(people)
  let claude = []

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      claude = await claudeOverlaps(people)
    } catch (err) {
      console.warn('[Overlap] Claude failed:', err.message)
    }
  }

  const merged = [...claude]
  for (const d of deterministic) {
    if (!merged.some(o => o.people?.join() === d.people.join())) merged.push(d)
  }

  await writeOverlaps(sessionId, merged.slice(0, 8))
  return merged
}
