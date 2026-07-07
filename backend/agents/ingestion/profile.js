import { addPerson, addSkillEdge, addDomainEdge, clearPersonSkills } from '../../lib/neo4j.js'
import { personIdForSession } from '../../lib/person-id.js'
import { extractFromGitHub } from './github.js'
import { extractFromLinkedIn } from './linkedin.js'

async function loadSources({ name, github, linkedin }) {
  const [ghData, liData] = await Promise.all([
    github?.trim()
      ? extractFromGitHub(github).catch(e => {
          console.warn('[GitHub]', e.message)
          return { skills: [], domains: [], summary: '', error: e.message }
        })
      : Promise.resolve({ skills: [], domains: [], summary: '' }),
    linkedin?.trim()
      ? extractFromLinkedIn(linkedin).catch(e => {
          console.warn('[LinkedIn]', e.message)
          return { skills: [], industries: [], summary: '' }
        })
      : Promise.resolve({ skills: [], industries: [], summary: '' })
  ])

  const skills = [...new Set([
    ...(ghData.skills || []),
    ...(liData.skills || [])
  ])].slice(0, 12)

  const domains = [...new Set([
    ...(ghData.domains || []),
    ...(liData.industries || []),
    ...(ghData.curiosity_areas || [])
  ])].slice(0, 8)

  const synthesis = ghData.synthesis
    || liData.summary
    || `${name} joined the hivemind.`

  return {
    skills,
    domains,
    synthesis,
    archetype: ghData.builder_style || liData.career_stage || 'builder',
    technical_depth: skills.length
      ? `Works with ${skills.slice(0, 4).join(', ')}.`
      : (liData.headline || ''),
    human_dimension: liData.trajectory || '',
    collaboration_style: '',
    strongest_in: [...new Set([...(ghData.technical_patterns || []), ...(liData.roles || [])])].slice(0, 4),
    curious_about: (ghData.curiosity_areas || []).slice(0, 4),
    conversation_topics: domains.slice(0, 4),
    githubError: ghData.error || null,
    repoCount: ghData.repoCount || 0
  }
}

export async function ingestProfile(sessionId, { userId, name, github, linkedin, personId: existingId }) {
  if (!userId) throw new Error('userId required')
  const personId = existingId || personIdForSession(sessionId, userId)
  const profile = await loadSources({ name, github, linkedin })

  if (existingId && (github?.trim() || linkedin?.trim())) {
    await clearPersonSkills(sessionId, personId)
  }

  await addPerson(sessionId, {
    id: personId,
    userId,
    name,
    github: github?.trim() || '',
    archetype: profile.archetype,
    synthesis: profile.synthesis,
    technical_depth: profile.technical_depth,
    human_dimension: profile.human_dimension,
    collaboration_style: profile.collaboration_style,
    strongest_in: profile.strongest_in,
    curious_about: profile.curious_about,
    blind_spots: [],
    conversation_topics: profile.conversation_topics,
    skills: profile.skills,
    domains: profile.domains
  })

  await Promise.all([
    ...profile.skills.map(s => addSkillEdge(sessionId, personId, s)),
    ...profile.domains.map(d => addDomainEdge(sessionId, personId, d))
  ])

  console.log(`[Profile] ${name} — ${profile.skills.length} skills, ${profile.domains.length} domains, ${profile.repoCount} repos`)

  return {
    personId,
    skills: profile.skills,
    domains: profile.domains,
    profile: { name, synthesis: profile.synthesis },
    githubError: profile.githubError,
    repoCount: profile.repoCount
  }
}
