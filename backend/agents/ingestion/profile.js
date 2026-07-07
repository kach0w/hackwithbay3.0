import { addPerson, addSkillEdge, addDomainEdge, clearPersonSkills } from '../../lib/neo4j.js'
import { personIdForSession } from '../../lib/person-id.js'
import { extractFromGitHub } from './github.js'
import { extractFromLinkedIn } from './linkedin.js'

function stubProfile(name) {
  return {
    skills: [],
    domains: [],
    synthesis: `${name} joined the hivemind.`,
    archetype: 'builder',
    technical_depth: '',
    human_dimension: '',
    collaboration_style: '',
    strongest_in: [],
    curious_about: [],
    conversation_topics: [],
    githubError: null,
    repoCount: 0
  }
}

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
      : (ghData.recentProjects?.length
        ? `Recent: ${ghData.recentProjects.slice(0, 3).map(p => p.name).join(', ')}.`
        : (liData.headline || '')),
    human_dimension: liData.trajectory || '',
    collaboration_style: '',
    strongest_in: [...new Set([...(ghData.technical_patterns || []), ...(liData.roles || [])])].slice(0, 4),
    curious_about: (ghData.curiosity_areas || []).slice(0, 4),
    conversation_topics: [
      ...domains.slice(0, 4),
      ...(ghData.recentProjects || []).slice(0, 3).map(p => p.name)
    ].slice(0, 6),
    githubError: ghData.error || null,
    repoCount: ghData.repoCount || 0,
    projectDigest: ghData.projectDigest || []
  }
}

async function writeProfile(sessionId, { personId, userId, name, github, profile, replaceSkills = false }) {
  if (replaceSkills) await clearPersonSkills(sessionId, personId)

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
    domains: profile.domains,
    project_digest: JSON.stringify(profile.projectDigest || [])
  })

  await Promise.all([
    ...profile.skills.map(s => addSkillEdge(sessionId, personId, s)),
    ...profile.domains.map(d => addDomainEdge(sessionId, personId, d))
  ])
}

function resultPayload(personId, name, profile) {
  return {
    personId,
    skills: profile.skills,
    domains: profile.domains,
    profile: { name, synthesis: profile.synthesis },
    githubError: profile.githubError,
    repoCount: profile.repoCount
  }
}

/** Add person to graph immediately — no external API calls. */
export async function quickJoinProfile(sessionId, { userId, name, github, linkedin, personId: existingId }) {
  if (!userId) throw new Error('userId required')
  const personId = existingId || personIdForSession(sessionId, userId)
  const profile = stubProfile(name)
  await writeProfile(sessionId, { personId, userId, name, github, profile })
  return resultPayload(personId, name, profile)
}

/** Fetch GitHub/LinkedIn and update the person node. */
export async function enrichProfile(sessionId, { userId, name, github, linkedin, personId }) {
  const profile = await loadSources({ name, github, linkedin })
  const replaceSkills = Boolean(github?.trim() || linkedin?.trim())
  await writeProfile(sessionId, { personId, userId, name, github, profile, replaceSkills })
  console.log(`[Profile] ${name} enriched — ${profile.skills.length} skills, ${profile.domains.length} domains`)
  return resultPayload(personId, name, profile)
}

/** Blocking full ingest (used by scripts/tests). */
export async function ingestProfile(sessionId, opts) {
  const { personId } = await quickJoinProfile(sessionId, opts)
  return enrichProfile(sessionId, { ...opts, personId })
}
