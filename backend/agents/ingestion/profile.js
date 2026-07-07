import Anthropic from '@anthropic-ai/sdk'
import { addPerson, addSkillEdge, addDomainEdge } from '../../lib/neo4j.js'
import { personIdForSession } from '../../lib/person-id.js'
import { extractFromGitHub } from './github.js'
import { extractFromLinkedIn } from './linkedin.js'
import { extractFromWebsite } from './website.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function synthesizeProfile(name, interests, ghData, liData, wsData) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 700,
    messages: [{
      role: 'user',
      content: `Profile ${name} from this data. Be specific, not generic. Return JSON only.

GitHub: langs=${(ghData.skills||[]).join(',')||'none'} repos=${ghData.repoCount||0} stars=${ghData.starCount||0} patterns=${(ghData.technical_patterns||[]).join(',')||'none'} curiosity=${(ghData.curiosity_areas||[]).join(',')||'none'} style="${ghData.builder_style||''}" summary="${ghData.summary||''}"
LinkedIn: headline="${liData.headline||''}" roles=${(liData.roles||[]).join(',')||'none'} stage=${liData.career_stage||'none'} trajectory="${liData.trajectory||''}"
Website: topics=${(wsData.topics||[]).join(',')||'none'} interests=${(wsData.intellectual_interests||[]).join(',')||'none'} style="${wsData.communication_style||''}" summary="${wsData.summary||''}"
Self: ${interests||'none'}

{"archetype":"systems-builder|product-thinker|researcher|infrastructure-engineer|full-stack-builder|data-engineer|designer-engineer|hacker|educator|founder-minded","synthesis":"2-3 sentences on who they really are as a builder and person","technical_depth":"one sentence","human_dimension":"one sentence on what drives them beyond tech","collaboration_style":"one sentence","strongest_in":["3 concrete areas"],"curious_about":["3 specific areas"],"blind_spots":["1-2 gaps"],"conversation_topics":["3 things they geek out on"],"skills":["max 10 concrete skills"],"domains":["max 6 domains"]}`
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
