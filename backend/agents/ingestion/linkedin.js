import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function fetchPage(url) {
  const normalizedUrl = url.startsWith('http') ? url : `https://linkedin.com/in/${url}`
  try {
    const res = await fetch(normalizedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research bot)' },
      signal: AbortSignal.timeout(8000)
    })
    const html = await res.text()
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000)
  } catch {
    return ''
  }
}

export async function extractFromLinkedIn(linkedinInput) {
  if (!linkedinInput?.trim()) return { skills: [], roles: [], companies: [], summary: '' }

  const text = await fetchPage(linkedinInput)
  if (!text) return { skills: [], roles: [], companies: [], summary: '' }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Extract professional profile from this LinkedIn page text.
Return JSON only:
{
  "skills": string[],
  "roles": string[],
  "companies": string[],
  "industries": string[],
  "summary": "one sentence on their professional trajectory"
}

Page text:
${text}`
    }]
  })

  const match = response.content[0].text.match(/\{[\s\S]*\}/)
  return match ? JSON.parse(match[0]) : { skills: [], roles: [], companies: [], summary: '' }
}
