import Anthropic from '@anthropic-ai/sdk'
import { addPerson, addSkillEdge, addDomainEdge } from '../../lib/neo4j.js'
import { personIdForSession } from '../../lib/person-id.js'
import { extractFromGitHub } from './github.js'
import { extractFromLinkedIn } from './linkedin.js'
import { extractFromWebsite } from './website.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function synthesizeProfile(name, interests, ghData, liData, wsData) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: `You are building a deep, honest profile of a person — not a resume summary, not a list of skills.
You are trying to understand who they really are: technically, intellectually, and humanistically.

Think about:
- What do they actually care about vs what they just do for work?
- What kind of thinker are they? (systems, product, creative, analytical, iterative...)
- What motivates them beyond compensation?
- How do they communicate and collaborate?
- What are they moving toward, not just where they've been?
- What is their relationship with technology — tool, craft, obsession, means to an end?
- What would they talk about at dinner that isn't on their resume?

Be specific. Avoid corporate language. Write as if you actually know this person.`,
    messages: [{
      role: 'user',
      content: `Build a complete profile of ${name} from all available data.

--- GITHUB (what they build and what they admire) ---
Languages/skills: ${(ghData.skills || []).join(', ') || 'none'}
Repos built: ${ghData.repoCount || 0}, Stars received: ${ghData.starCount || 0}
Technical patterns: ${(ghData.technical_patterns || []).join(', ') || 'none'}
Curiosity areas (from stars): ${(ghData.curiosity_areas || []).join(', ') || 'none'}
Builder style: ${ghData.builder_style || 'none'}
GitHub summary: ${ghData.summary || 'none'}

--- LINKEDIN (their professional trajectory) ---
Headline: ${liData.headline || 'none'}
Roles: ${(liData.roles || []).join(', ') || 'none'}
Companies: ${(liData.companies || []).join(', ') || 'none'}
Industries: ${(liData.industries || []).join(', ') || 'none'}
Career stage: ${liData.career_stage || 'none'}
Trajectory: ${liData.trajectory || 'none'}
LinkedIn summary: ${liData.summary || 'none'}

--- PERSONAL WEBSITE (what they think and write about) ---
Topics: ${(wsData.topics || []).join(', ') || 'none'}
Intellectual interests: ${(wsData.intellectual_interests || []).join(', ') || 'none'}
Values: ${(wsData.values || []).join(', ') || 'none'}
Writing style: ${wsData.writing_style || 'none'}
Communication style: ${wsData.communication_style || 'none'}
Website summary: ${wsData.summary || 'none'}

--- SELF-REPORTED ---
${interests || 'none'}

Return JSON only:
{
  "archetype": "one of: systems-builder | product-thinker | researcher | infrastructure-engineer | full-stack-builder | data-engineer | designer-engineer | hacker | educator | founder-minded",

  "synthesis": "3-4 sentences that paint a real picture of this person — their technical depth, what drives them humanistically, how they think, and what makes them distinct as a collaborator and builder. Write as if describing them to a teammate who hasn't met them yet.",

  "technical_depth": "one sentence on where they have real depth vs where they're still exploring",

  "human_dimension": "one sentence on what drives them beyond technology — what problem in the world they seem to care about fixing, or what kind of impact they're after",

  "collaboration_style": "one sentence on how they likely work with others based on communication patterns and background",

  "strongest_in": ["3 specific areas of genuine depth — be concrete"],

  "curious_about": ["3 areas they're clearly moving toward or exploring — be specific"],

  "blind_spots": ["1-2 honest gaps or areas they likely haven't worked in yet — useful for team composition"],

  "conversation_topics": ["3 things this person would genuinely geek out about beyond their job title"],

  "skills": ["concrete technical skills, max 10"],
  "domains": ["problem domains they work in or toward, max 6"]
}`
    }]
  })

  const match = response.content[0].text.match(/\{[\s\S]*\}/)
  return match ? JSON.parse(match[0]) : {}
}

export async function ingestProfile(sessionId, { userId, name, github, linkedin, website, interests }) {
  if (!userId) throw new Error('userId required')
  const personId = personIdForSession(sessionId, userId)

  console.log(`[Profile] Ingesting ${name}...`)

  const [ghData, liData, wsData] = await Promise.all([
    github   ? extractFromGitHub(github).catch(e   => { console.warn('[GitHub] failed:', e.message);   return {} }) : Promise.resolve({}),
    linkedin ? extractFromLinkedIn(linkedin).catch(e => { console.warn('[LinkedIn] failed:', e.message); return {} }) : Promise.resolve({}),
    website  ? extractFromWebsite(website).catch(e  => { console.warn('[Website] failed:', e.message);  return {} }) : Promise.resolve({})
  ])

  console.log(`[Profile] Synthesizing ${name}...`)
  const profile = await synthesizeProfile(name, interests, ghData, liData, wsData)

  const allSkills  = [...new Set([...(ghData.skills || []), ...(liData.skills || []), ...(profile.skills || [])])]
  const allDomains = [...new Set([...(ghData.domains || []), ...(wsData.domains || []), ...(profile.domains || [])])]

  await addPerson(sessionId, {
    id: personId,
    userId,
    name,
    github: github || '',
    archetype:           profile.archetype || '',
    synthesis:           profile.synthesis || '',
    technical_depth:     profile.technical_depth || '',
    human_dimension:     profile.human_dimension || '',
    collaboration_style: profile.collaboration_style || '',
    strongest_in:        profile.strongest_in || [],
    curious_about:       profile.curious_about || [],
    blind_spots:         profile.blind_spots || [],
    conversation_topics: profile.conversation_topics || [],
    skills:  allSkills,
    domains: allDomains
  })

  await Promise.all([
    ...allSkills.slice(0, 10).map(s  => addSkillEdge(sessionId, personId, s)),
    ...allDomains.slice(0, 6).map(d => addDomainEdge(sessionId, personId, d))
  ])

  console.log(`[Profile] ${name} done — ${allSkills.length} skills, ${allDomains.length} domains`)
  return { personId, skills: allSkills, domains: allDomains, profile }
}
