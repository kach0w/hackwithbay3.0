import Anthropic from '@anthropic-ai/sdk'
import { run } from '../../lib/neo4j.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function computeOverlaps(sessionId) {
  // Pull all person profiles from Neo4j
  const records = await run(`
    MATCH (p:Person)-[:IN_SESSION]->(s:Session {id: $sessionId})
    RETURN p.name as name, p.synthesis as synthesis, p.archetype as archetype,
           p.strongest_in as strongest_in, p.curious_about as curious_about,
           p.skills as skills, p.domains as domains
  `, { sessionId })

  const people = records.map(r => r.toObject())
  if (people.length < 2) return []

  // Claude reasons over ALL profiles together to find meaningful intersections
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: `You find meaningful overlaps between builders that could lead to great projects.
Do NOT just match tags. Reason about complementary skills, shared curiosities, and what they could uniquely build together.
An overlap should be specific enough to suggest a real project direction.`,
    messages: [{
      role: 'user',
      content: `Find meaningful overlaps between these team members.

${people.map(p => `
NAME: ${p.name}
ARCHETYPE: ${p.archetype}
SYNTHESIS: ${p.synthesis}
STRONGEST IN: ${(p.strongest_in || []).join(', ')}
CURIOUS ABOUT: ${(p.curious_about || []).join(', ')}
SKILLS: ${(p.skills || []).join(', ')}
DOMAINS: ${(p.domains || []).join(', ')}
`).join('\n---\n')}

Find overlaps between pairs AND the full group. For each overlap:
- What do they genuinely share (not just surface-level)?
- What could they build together that nobody else on the team could?
- Why is this combination specifically powerful?

Return JSON only:
{
  "overlaps": [
    {
      "id": "unique_slug",
      "people": ["name1", "name2"],
      "label": "short label for the overlap node (e.g. 'Systems + ML Edge')",
      "intersection": "one sentence: what they genuinely share and why it's non-obvious",
      "build_direction": "one sentence: what they could uniquely build together",
      "strength": 1-5
    }
  ]
}`
    }]
  })

  const match = response.content[0].text.match(/\{[\s\S]*\}/)
  if (!match) return []

  const { overlaps } = JSON.parse(match[0])

  // Write overlap nodes to Neo4j
  for (const overlap of overlaps) {
    await run(`
      MATCH (s:Session {id: $sessionId})
      MERGE (o:Overlap {id: $id})-[:IN_SESSION]->(s)
      SET o.label = $label, o.intersection = $intersection,
          o.build_direction = $build_direction, o.strength = $strength
    `, { sessionId, id: overlap.id, label: overlap.label, intersection: overlap.intersection, build_direction: overlap.build_direction, strength: overlap.strength })

    for (const personName of overlap.people) {
      await run(`
        MATCH (p:Person)-[:IN_SESSION]->(s:Session {id: $sessionId})
        WHERE toLower(p.name) = toLower($personName)
        MATCH (o:Overlap {id: $overlapId})-[:IN_SESSION]->(s)
        MERGE (p)-[:OVERLAPS_WITH]->(o)
      `, { sessionId, personName, overlapId: overlap.id })
    }
  }

  return overlaps
}
