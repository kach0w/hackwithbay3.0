import Anthropic from '@anthropic-ai/sdk'
import { addPerson, addSkillEdge, addDomainEdge } from '../../lib/neo4j.js'
import { extractFromGitHub } from './github.js'
import { extractFromLinkedIn } from './linkedin.js'
import { extractFromWebsite } from './website.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function synthesizeProfile(name, github, linkedin, website, interests, ghData, liData, wsData) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are building a deep, logical profile of a builder/developer.
Do not just list tags. Reason about the person — their trajectory, what problems they gravitate toward, how they think, what they'd be uniquely good at building.
Be specific and concrete. Avoid generic statements like "passionate about technology".`,
    messages: [{
      role: 'user',
      content: `Build a complete profile of ${name} from all available data.

GITHUB:
- Languages/skills: ${ghData.skills?.join(', ') || 'none'}
- Domains inferred from repos: ${ghData.domains?.join(', ') || 'none'}
- GitHub summary: ${ghData.summary || 'none'}

LINKEDIN:
- Roles: ${liData.roles?.join(', ') || 'none'}
- Companies: ${liData.companies?.join(', ') || 'none'}
- Industries: ${liData.industries?.join(', ') || 'none'}
- LinkedIn summary: ${liData.summary || 'none'}

PERSONAL WEBSITE:
- Topics they write about: ${wsData.topics?.join(', ') || 'none'}
- Writing style: ${wsData.writing_style || 'none'}
- Website summary: ${wsData.summary || 'none'}

SELF-REPORTED INTERESTS: ${interests || 'none'}

Return JSON only:
{
  "archetype": "one of: systems-builder | product-thinker | researcher | infrastructure-engineer | full-stack-builder | data-engineer | designer-engineer",
  "synthesis": "2-3 sentence paragraph describing this person as a builder — their trajectory, what they gravitate toward, what makes them distinct. Be specific.",
  "strongest_in": ["top 3 concrete areas where they have real depth"],
  "curious_about": ["top 3 areas they're clearly exploring or moving toward"],
  "working_style": "one sentence on how they approach problems",
  "skills": ["concrete technical skills, max 8"],
  "domains": ["problem domains, max 6"]
}`
    }]
  })

  const match = response.content[0].text.match(/\{[\s\S]*\}/)
  return match ? JSON.parse(match[0]) : {}
}

export async function ingestProfile(sessionId, { name, github, linkedin, website, interests }) {
  const personId = `person_${name.toLowerCase().replace(/\s+/g, '_')}`

  // Parallel scraping
  const [ghData, liData, wsData] = await Promise.all([
    github   ? extractFromGitHub(github).catch(() => ({ skills: [], domains: [], summary: '' }))   : Promise.resolve({ skills: [], domains: [], summary: '' }),
    linkedin ? extractFromLinkedIn(linkedin).catch(() => ({ skills: [], roles: [], companies: [], industries: [], summary: '' })) : Promise.resolve({ skills: [], roles: [], companies: [], industries: [], summary: '' }),
    website  ? extractFromWebsite(website).catch(() => ({ topics: [], domains: [], summary: '' }))  : Promise.resolve({ topics: [], domains: [], summary: '' })
  ])

  // Claude synthesizes everything into a complete picture
  const profile = await synthesizeProfile(name, github, linkedin, website, interests, ghData, liData, wsData)

  const allSkills  = [...new Set([...(ghData.skills || []), ...(liData.skills || []), ...(profile.skills || [])])]
  const allDomains = [...new Set([...(ghData.domains || []), ...(wsData.domains || []), ...(profile.domains || [])])]

  await addPerson(sessionId, {
    id: personId,
    name,
    github:      github || '',
    archetype:   profile.archetype || '',
    synthesis:   profile.synthesis || '',
    strongest_in: profile.strongest_in || [],
    curious_about: profile.curious_about || [],
    working_style: profile.working_style || '',
    skills:  allSkills,
    domains: allDomains
  })

  await Promise.all([
    ...allSkills.slice(0, 8).map(s  => addSkillEdge(sessionId, personId, s)),
    ...allDomains.slice(0, 6).map(d => addDomainEdge(sessionId, personId, d))
  ])

  return { personId, skills: allSkills, domains: allDomains, profile }
}
