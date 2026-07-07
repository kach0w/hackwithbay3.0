import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function extractFromWebsite(url) {
  if (!url?.trim()) return { topics: [], domains: [], summary: '' }

  const normalized = url.startsWith('http') ? url : `https://${url}`
  try {
    const res = await fetch(normalized, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research bot)' },
      signal: AbortSignal.timeout(8000)
    })
    const html = await res.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000)

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Extract what this person writes and thinks about from their personal website.
Return JSON only:
{
  "topics": string[],
  "domains": string[],
  "writing_style": "technical|narrative|product|research",
  "summary": "one sentence on what this person cares about based on their site"
}

Website text:
${text}`
      }]
    })

    const match = response.content[0].text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { topics: [], domains: [], summary: '' }
  } catch {
    return { topics: [], domains: [], summary: '' }
  }
}
