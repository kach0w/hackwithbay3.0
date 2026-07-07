import Anthropic from '@anthropic-ai/sdk'
import { addPerson, addSkillEdge, addDomainEdge } from '../../lib/neo4j.js'
import { extractFromGitHub } from './github.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function extractFromInterests(interests) {
  if (!interests?.trim()) return { domains: [], skills: [] }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Extract domains and technical skills from this person's self-described interests.
Return JSON only: { "domains": string[], "skills": string[] }

Interests: "${interests}"`
    }]
  })

  const match = response.content[0].text.match(/\{[\s\S]*\}/)
  return match ? JSON.parse(match[0]) : { domains: [], skills: [] }
}

export async function ingestProfile(sessionId, { name, github, linkedin, twitter, interests }) {
  const personId = `person_${name.toLowerCase().replace(/\s+/g, '_')}`

  // Run GitHub + interests extraction in parallel
  const [ghData, interestData] = await Promise.all([
    github ? extractFromGitHub(github).catch(() => ({ skills: [], domains: [], summary: '' })) : Promise.resolve({ skills: [], domains: [], summary: '' }),
    extractFromInterests(interests)
  ])

  const allSkills = [...new Set([...ghData.skills, ...interestData.skills])]
  const allDomains = [...new Set([...ghData.domains, ...interestData.domains])]

  // Store person node
  await addPerson(sessionId, {
    id: personId,
    name,
    github: github || '',
    summary: ghData.summary,
    skills: allSkills,
    domains: allDomains
  })

  // Store skill + domain edges for graph traversal
  await Promise.all([
    ...allSkills.slice(0, 8).map(s => addSkillEdge(sessionId, personId, s)),
    ...allDomains.slice(0, 6).map(d => addDomainEdge(sessionId, personId, d))
  ])

  return { personId, skills: allSkills, domains: allDomains, summary: ghData.summary }
}
