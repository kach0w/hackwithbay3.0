const UA = 'Hivemind/1.0 (hackwithbay hackathon)'

const TECH_KEYWORDS = [
  'react', 'next.js', 'nextjs', 'vue', 'svelte', 'angular', 'typescript', 'javascript',
  'python', 'rust', 'go', 'golang', 'java', 'kotlin', 'swift', 'c++', 'c#',
  'node', 'nodejs', 'express', 'fastapi', 'django', 'flask', 'rails',
  'postgres', 'postgresql', 'mysql', 'mongodb', 'redis', 'neo4j', 'graphql',
  'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'terraform',
  'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'llm', 'openai',
  'vite', 'webpack', 'tailwind', 'prisma', 'supabase', 'firebase',
  'electron', 'flutter', 'react native', 'ios', 'android'
]

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
  if (result.error || !result.data || typeof result.data !== 'object') return []
  return Object.entries(result.data)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang)
}

async function fetchReadme(owner, repo) {
  const result = await fetchGitHub(`/repos/${owner}/${repo}/readme`)
  if (result.error || !result.data?.content) return ''
  try {
    return Buffer.from(result.data.content, 'base64')
      .toString('utf8')
      .replace(/\r\n/g, '\n')
      .slice(0, 5000)
  } catch {
    return ''
  }
}

function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/[#>*_~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function skillsFromText(text) {
  const skills = new Set()
  const lower = text.toLowerCase()

  for (const m of text.matchAll(/```(\w{2,20})/g)) {
    const lang = m[1]
    if (!['text', 'bash', 'sh', 'console', 'json', 'yaml', 'yml'].includes(lang.toLowerCase())) {
      skills.add(lang.charAt(0).toUpperCase() + lang.slice(1))
    }
  }

  for (const kw of TECH_KEYWORDS) {
    if (lower.includes(kw)) {
      skills.add(kw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
    }
  }

  return [...skills]
}

function inferDomains(repos, readmeText = '') {
  const domains = new Set()
  const keywords = {
    'machine-learning': ['ml', 'ai', 'neural', 'llm', 'model', 'tensorflow', 'pytorch', 'gpt'],
    'web': ['web', 'frontend', 'react', 'next', 'vue', 'webapp', 'vite'],
    'mobile': ['mobile', 'ios', 'android', 'flutter', 'react-native'],
    'devtools': ['cli', 'tool', 'sdk', 'library', 'framework', 'dev', 'hackathon'],
    'data': ['data', 'analytics', 'pipeline', 'etl', 'database', 'graph'],
    'security': ['security', 'auth', 'crypto', 'encrypt'],
    'infra': ['docker', 'kubernetes', 'cloud', 'deploy', 'infra'],
    'games': ['game', 'unity', 'godot'],
    'education': ['learn', 'course', 'tutorial', 'education']
  }

  const blob = [
    ...repos.map(r => `${r.name} ${r.description || ''}`),
    readmeText
  ].join(' ').toLowerCase()

  for (const r of repos) {
    for (const t of r.topics || []) domains.add(t)
  }

  for (const [domain, words] of Object.entries(keywords)) {
    if (words.some(w => blob.includes(w))) domains.add(domain)
  }

  return [...domains]
}

function synthesisFromRecent(handle, repos) {
  const lines = repos
    .slice(0, 5)
    .map(r => {
      const when = r.pushed_at ? new Date(r.pushed_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''
      const desc = r.readmeSnippet || r.description || 'active project'
      return `${r.name} (${when}): ${desc}`
    })

  if (!lines.length) return `${handle} on GitHub`
  return `${handle}'s recent work — ${lines.slice(0, 3).join('; ')}`
}

async function synthesizeFromRepos(handle, repos, skills, domains) {
  const recentSummary = synthesisFromRecent(handle, repos)

  if (process.env.PROFILE_CLAUDE !== 'true' || !process.env.ANTHROPIC_API_KEY) {
    return {
      archetype: repos[0]?.topics?.[0] || 'builder',
      synthesis: recentSummary,
      technical_patterns: skills.slice(0, 3),
      curiosity_areas: domains.slice(0, 3),
      builder_style: 'builder'
    }
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const repoBlock = repos.slice(0, 10).map(r => {
      const readme = r.readmeText ? `\nREADME excerpt: ${stripMarkdown(r.readmeText).slice(0, 400)}` : ''
      return `${r.name}: ${r.description || '(no description)'} [${(r.languages || []).join(', ') || r.language || '?'}]${readme}`
    }).join('\n\n')

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Analyze recent GitHub projects for ${handle}. Return JSON only.\n\n${repoBlock}\n\n{"archetype":"short label","synthesis":"2 sentences","technical_patterns":["3"],"curiosity_areas":["3"],"builder_style":"phrase"}`
      }]
    })
    const match = response.content[0].text.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : {}
    return {
      ...parsed,
      synthesis: parsed.synthesis || recentSummary
    }
  } catch (err) {
    console.warn('[GitHub] synthesis failed:', err.message)
    return {
      archetype: 'builder',
      synthesis: recentSummary,
      technical_patterns: skills.slice(0, 3),
      curiosity_areas: domains.slice(0, 3),
      builder_style: 'builder'
    }
  }
}

async function enrichRepoDetails(handle, repo) {
  const base = {
    ...repo,
    languages: repo.language ? [repo.language] : [],
    readmeText: '',
    readmeSnippet: ''
  }

  const langs = await fetchRepoLanguages(handle, repo.name)
  if (langs.length) base.languages = langs

  const readme = await fetchReadme(handle, repo.name)
  if (readme) {
    base.readmeText = readme
    base.readmeSnippet = stripMarkdown(readme).slice(0, 160)
  }

  return base
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

  const listRes = await fetchGitHub(`/users/${handle}/repos?per_page=50&sort=pushed&type=owner`)
  const rateLimited = listRes.error === 'rate_limit'
  const allRepos = Array.isArray(listRes.data) ? listRes.data : []
  const created = allRepos.filter(r => !r.fork)

  if (!created.length && !rateLimited) {
    return {
      skills: [],
      domains: [],
      summary: userRes.data?.bio || `${handle} on GitHub`,
      repoCount: 0,
      starCount: 0,
      handle
    }
  }

  if (rateLimited) {
    return {
      handle,
      skills: [],
      domains: [],
      synthesis: userRes.data?.bio || `${handle} on GitHub`,
      summary: userRes.data?.bio || `${handle} on GitHub`,
      repoCount: 0,
      starCount: 0,
      error: 'rate_limit',
      technical_patterns: [],
      curiosity_areas: [],
      builder_style: 'builder'
    }
  }

  const recentRepos = created
    .sort((a, b) => new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0))
    .slice(0, 10)

  const enriched = await Promise.all(
    recentRepos.map(repo => enrichRepoDetails(handle, repo))
  )

  const langCounts = {}
  const readmeSkills = new Set()
  let allReadmeText = ''

  for (const r of enriched) {
    for (const lang of r.languages) {
      langCounts[lang] = (langCounts[lang] || 0) + 1
    }
    if (r.readmeText) {
      allReadmeText += ` ${r.readmeText}`
      for (const s of skillsFromText(r.readmeText)) readmeSkills.add(s)
    }
  }

  const langSkills = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang)

  const skills = [...new Set([...langSkills, ...readmeSkills])].slice(0, 12)
  const domains = inferDomains(enriched, allReadmeText)
  const starCount = created.reduce((s, r) => s + (r.stargazers_count || 0), 0)
  const analysis = await synthesizeFromRepos(handle, enriched, skills, domains)

  console.log(`[GitHub] ${handle} — ${recentRepos.length} recent repos, ${skills.length} skills, ${enriched.filter(r => r.readmeText).length} readmes`)

  return {
    handle,
    skills,
    domains,
    technical_patterns: analysis.technical_patterns || skills.slice(0, 3),
    curiosity_areas: analysis.curiosity_areas || domains.slice(0, 3),
    builder_style: analysis.archetype || analysis.builder_style || 'builder',
    synthesis: analysis.synthesis || synthesisFromRecent(handle, enriched),
    summary: analysis.synthesis || userRes.data?.bio || `${handle} on GitHub`,
    repoCount: created.length,
    starCount,
    recentProjects: enriched.map(r => ({
      name: r.name,
      description: r.description,
      pushed_at: r.pushed_at,
      hasReadme: Boolean(r.readmeText)
    })),
    projectDigest: enriched.map(r => ({
      name: r.name,
      description: r.description || '',
      pushed_at: r.pushed_at,
      languages: r.languages || [],
      readme: r.readmeText ? stripMarkdown(r.readmeText).slice(0, 800) : ''
    }))
  }
}
