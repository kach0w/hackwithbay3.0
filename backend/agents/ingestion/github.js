import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function fetchGitHub(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      'Accept': 'application/vnd.github+json',
      ...(process.env.GITHUB_TOKEN && { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` })
    }
  })
  if (!res.ok) return []
  return res.json()
}

export async function extractFromGitHub(username) {
  if (!username?.trim()) return { skills: [], domains: [], summary: '', languages: {}, repoCount: 0, starCount: 0 }

  // Strip github.com/ prefix if user pasted full URL
  const handle = username.replace(/^.*github\.com\//, '').replace(/\/$/, '')

  const [repos, starred] = await Promise.all([
    fetchGitHub(`/users/${handle}/repos?per_page=100&sort=updated`),
    fetchGitHub(`/users/${handle}/starred?per_page=100`)
  ])

  if (!Array.isArray(repos)) return { skills: [], domains: [], summary: '', languages: {}, repoCount: 0, starCount: 0 }

  // Language frequency across owned repos
  const languages = {}
  for (const r of repos) {
    if (r.language) languages[r.language] = (languages[r.language] || 0) + 1
  }

  const topLanguages = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([l]) => l)

  // Build rich repo summaries including topics, stars received, forks
  const ownedSummaries = repos
    .slice(0, 50)
    .map(r => `[BUILT] ${r.name} (⭐${r.stargazers_count} forks:${r.forks_count}): ${r.description || ''} [${(r.topics || []).join(', ')}] lang:${r.language || '?'}`)

  const starredSummaries = (Array.isArray(starred) ? starred : [])
    .slice(0, 60)
    .map(r => `[STARRED] ${r.full_name}: ${r.description || ''} [${(r.topics || []).join(', ')}] lang:${r.language || '?'}`)

  const allSummaries = [...ownedSummaries, ...starredSummaries].join('\n')

  if (!allSummaries.trim()) return { skills: topLanguages, domains: [], summary: '', languages, repoCount: repos.length, starCount: 0 }

  const totalStarsReceived = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 768,
    messages: [{
      role: 'user',
      content: `Analyze this GitHub profile to understand who this developer is — technically AND as a person.

Repos they BUILT reveal what they ship. Repos they STARRED reveal what they find interesting or aspirational.
Look for patterns: what problems do they keep coming back to? What do they admire in others' work?
What does the ratio of built vs starred tell you about how they explore vs execute?

GitHub data:
${allSummaries.slice(0, 6000)}

Return JSON only:
{
  "domains": ["problem domains, inferred from both built and starred"],
  "technical_patterns": ["recurring technical themes — e.g. 'builds CLI tools', 'interested in distributed systems'"],
  "curiosity_areas": ["what they explore via stars but haven't built yet — aspirational interests"],
  "builder_style": "one sentence on how they build — e.g. 'ships small focused tools', 'explores broadly before committing'",
  "summary": "2 sentences on this developer — what they build, what draws their attention, what makes them distinct"
}`
    }]
  })

  const match = response.content[0].text.match(/\{[\s\S]*\}/)
  const extracted = match ? JSON.parse(match[0]) : {}

  return {
    skills: topLanguages,
    domains: extracted.domains || [],
    technical_patterns: extracted.technical_patterns || [],
    curiosity_areas: extracted.curiosity_areas || [],
    builder_style: extracted.builder_style || '',
    summary: extracted.summary || '',
    languages,
    repoCount: repos.length,
    starCount: totalStarsReceived
  }
}
