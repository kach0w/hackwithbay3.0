const UA = 'Hivemind/1.0 (hackwithbay hackathon)'

function parseHandle(input) {
  let h = String(input || '').trim()
  if (!h) return ''
  h = h.replace(/^@/, '')
  h = h.replace(/^https?:\/\/(www\.)?github\.com\//i, '')
  h = h.replace(/\/$/, '').split('/')[0]
  return h
}

async function fetchGitHub(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': UA,
      ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` })
    },
    signal: AbortSignal.timeout(12000)
  })
  if (res.status === 404) return { error: 'not_found' }
  if (res.status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining')
    return { error: remaining === '0' ? 'rate_limit' : 'forbidden' }
  }
  if (!res.ok) return { error: `http_${res.status}` }
  return { data: await res.json() }
}

async function fetchRepoLanguages(owner, repo) {
  const result = await fetchGitHub(`/repos/${owner}/${repo}/languages`)
  if (!result.data || typeof result.data !== 'object') return []
  return Object.entries(result.data)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang)
}

function inferDomains(repos) {
  const domains = new Set()
  const keywords = {
    'machine-learning': ['ml', 'ai', 'neural', 'llm', 'model', 'tensorflow', 'pytorch'],
    'web': ['web', 'frontend', 'react', 'next', 'vue', 'webapp'],
    'mobile': ['mobile', 'ios', 'android', 'flutter', 'react-native'],
    'devtools': ['cli', 'tool', 'sdk', 'library', 'framework', 'dev'],
    'data': ['data', 'analytics', 'pipeline', 'etl', 'database'],
    'security': ['security', 'auth', 'crypto', 'encrypt'],
    'infra': ['docker', 'kubernetes', 'cloud', 'deploy', 'infra'],
    'games': ['game', 'unity', 'godot'],
    'education': ['learn', 'course', 'tutorial', 'education']
  }
  for (const r of repos) {
    for (const t of r.topics || []) domains.add(t)
    const blob = `${r.name} ${r.description || ''}`.toLowerCase()
    for (const [domain, words] of Object.entries(keywords)) {
      if (words.some(w => blob.includes(w))) domains.add(domain)
    }
  }
  return [...domains]
}

function buildRepoSummaries(repos) {
  return repos
    .slice(0, 20)
    .map(r => `${r.name}: ${r.description || '(no description)'} [${(r.languages || []).join(', ') || r.language || '?'}] ⭐${r.stargazers_count || 0}`)
    .join('\n')
}

async function synthesizeFromRepos(handle, repos, skills, domains) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || !repos.length) {
    return {
      archetype: 'builder',
      synthesis: repos[0]?.description
        ? `${handle} builds ${repos[0].name} — ${repos[0].description}`
        : `${handle} — ${repos.length} repos on GitHub`,
      technical_patterns: skills.slice(0, 3),
      curiosity_areas: domains.slice(0, 3),
      builder_style: 'builder'
    }
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Analyze these CREATED repos (not forks) for GitHub user ${handle}. Return JSON only.

${buildRepoSummaries(repos)}

{"archetype":"short label","synthesis":"2 sentences on what they build and care about","technical_patterns":["3 patterns"],"curiosity_areas":["3 interests from repos"],"builder_style":"one phrase"}`
      }]
    })
    const match = response.content[0].text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : {}
  } catch (err) {
    console.warn('[GitHub] synthesis failed:', err.message)
    return {}
  }
}

export async function extractFromGitHub(username) {
  const handle = parseHandle(username)
  if (!handle) {
    return { skills: [], domains: [], summary: '', repoCount: 0, starCount: 0, error: 'empty_handle' }
  }

  const userRes = await fetchGitHub(`/users/${handle}`)
  if (userRes.error === 'not_found') {
    throw new Error(`GitHub user "${handle}" not found — check the username`)
  }
  if (userRes.error === 'rate_limit') {
    throw new Error('GitHub API rate limit hit — add GITHUB_TOKEN to backend/.env')
  }
  if (userRes.error) {
    throw new Error(`GitHub API error (${userRes.error})`)
  }

  const listRes = await fetchGitHub(`/users/${handle}/repos?per_page=100&sort=pushed&type=owner`)
  const allRepos = Array.isArray(listRes.data) ? listRes.data : []
  const created = allRepos.filter(r => !r.fork)

  if (!created.length) {
    return {
      skills: [],
      domains: [],
      summary: userRes.data?.bio || `${handle} on GitHub`,
      repoCount: 0,
      starCount: 0,
      handle
    }
  }

  const topRepos = created
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, 15)

  const langResults = await Promise.all(
    topRepos.map(async r => {
      const langs = await fetchRepoLanguages(handle, r.name)
      return { ...r, languages: langs.length ? langs : (r.language ? [r.language] : []) }
    })
  )

  const langCounts = {}
  for (const r of langResults) {
    for (const lang of r.languages) {
      langCounts[lang] = (langCounts[lang] || 0) + 1
    }
  }
  const skills = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([lang]) => lang)

  const domains = inferDomains(langResults)
  const starCount = created.reduce((s, r) => s + (r.stargazers_count || 0), 0)
  const analysis = await synthesizeFromRepos(handle, langResults, skills, domains)

  return {
    handle,
    skills,
    domains,
    technical_patterns: analysis.technical_patterns || [],
    curiosity_areas: analysis.curiosity_areas || domains.slice(0, 3),
    builder_style: analysis.archetype || analysis.builder_style || 'builder',
    synthesis: analysis.synthesis || `${handle} — ${created.length} created repos`,
    summary: analysis.synthesis || userRes.data?.bio || `${handle} on GitHub`,
    repoCount: created.length,
    starCount
  }
}
