import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research bot)' },
    signal: AbortSignal.timeout(4000)
  })
  const html = await res.text()
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractLinks(html, baseUrl) {
  const base = new URL(baseUrl)
  const matches = [...html.matchAll(/href=["']([^"']+)["']/gi)]
  const seen = new Set()
  const links = []
  for (const [, href] of matches) {
    try {
      const url = new URL(href, baseUrl)
      // Only follow links on the same domain, not already visited
      if (url.hostname === base.hostname && !seen.has(url.pathname) && url.pathname !== '/') {
        seen.add(url.pathname)
        links.push(url.href)
      }
    } catch {}
  }
  return links.slice(0, 2) // crawl up to 2 sub-pages for speed
}

export async function extractFromWebsite(url) {
  if (!url?.trim()) return { topics: [], domains: [], writing_style: '', summary: '', raw: '' }

  const normalized = url.startsWith('http') ? url : `https://${url}`

  try {
    // Fetch main page HTML (for link extraction) and text
    const res = await fetch(normalized, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research bot)' },
      signal: AbortSignal.timeout(4000)
    })
    const mainHtml = await res.text()
    const mainText = mainHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Crawl sub-pages in parallel
    const subLinks = extractLinks(mainHtml, normalized)
    const subTexts = await Promise.all(
      subLinks.map(link => fetchText(link).catch(() => ''))
    )

    const allText = [mainText, ...subTexts]
      .filter(Boolean)
      .join('\n\n---\n\n')
      .slice(0, 10000)

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Analyze this person's entire personal website to understand who they are.

Look at what they write about, how they write, what projects they showcase, what they value, and what their intellectual interests are.
Go beyond just extracting tags — infer their personality, curiosity patterns, and what they care about.

Website content (${subLinks.length + 1} pages):
${allText}

Return JSON only:
{
  "topics": ["concrete topics they write or think about"],
  "domains": ["problem domains they engage with"],
  "writing_style": "technical|narrative|product|research|mixed",
  "communication_style": "one sentence on how they communicate — concise, expressive, analytical, etc.",
  "intellectual_interests": ["things they seem genuinely curious about beyond their job"],
  "values": ["values evident from their writing — e.g. clarity, open source, education"],
  "summary": "2 sentences: what this person cares about and what makes their perspective distinct"
}`
      }]
    })

    const match = response.content[0].text.match(/\{[\s\S]*\}/)
    return match ? { ...JSON.parse(match[0]), raw: allText.slice(0, 500) } : { topics: [], domains: [], summary: '' }
  } catch (err) {
    console.warn('[Website] Failed:', err.message)
    return { topics: [], domains: [], summary: '' }
  }
}
