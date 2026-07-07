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
  const [repos, starred] = await Promise.all([
    fetchGitHub(`/users/${username}/repos?per_page=100&sort=updated`),
    fetchGitHub(`/users/${username}/starred?per_page=50`)
  ])

  const languages = {}
  for (const r of repos) {
    if (r.language) languages[r.language] = (languages[r.language] || 0) + 1
  }

  const topLanguages = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([l]) => l)

  const repoSummaries = [...repos, ...starred]
    .filter(r => r.description || r.topics?.length)
    .slice(0, 40)
    .map(r => `${r.name}: ${r.description || ''} [${(r.topics || []).join(', ')}]`)
    .join('\n')

  if (!repoSummaries) return { skills: topLanguages, domains: [], summary: '' }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Extract domains of interest and a one-sentence builder summary from these GitHub repos.
Return JSON only: { "domains": string[], "summary": string }

Repos:
${repoSummaries}`
    }]
  })

  const match = response.content[0].text.match(/\{[\s\S]*\}/)
  const extracted = match ? JSON.parse(match[0]) : { domains: [], summary: '' }

  return {
    skills: topLanguages,
    domains: extracted.domains || [],
    summary: extracted.summary || ''
  }
}
