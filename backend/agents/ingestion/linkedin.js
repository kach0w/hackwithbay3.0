import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function extractFromLinkedIn(linkedinInput) {
  if (!linkedinInput?.trim()) return { skills: [], roles: [], companies: [], industries: [], summary: '' }

  // Normalize: accept full URL or just username
  let url = linkedinInput.trim()
  if (!url.startsWith('http')) {
    url = url.startsWith('linkedin.com') ? `https://${url}` : `https://linkedin.com/in/${url}`
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000)
    })

    const html = await res.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000)

    if (text.length < 200) {
      // LinkedIn blocked the scrape — return gracefully
      return { skills: [], roles: [], companies: [], industries: [], summary: 'LinkedIn profile not publicly accessible' }
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Extract a professional profile from this LinkedIn page.
Look at their full trajectory: education, roles, companies, skills listed, and any about section.
Infer not just what they've done but what kind of professional they are becoming.

Page text:
${text}

Return JSON only:
{
  "name": "their name if visible",
  "headline": "their LinkedIn headline",
  "skills": ["technical and soft skills listed"],
  "roles": ["job titles held"],
  "companies": ["companies worked at"],
  "industries": ["industries they've worked in"],
  "education": ["schools/degrees"],
  "career_stage": "early|mid|senior|lead",
  "trajectory": "one sentence on where their career is heading based on progression",
  "summary": "2 sentences: their professional story and what kind of work they gravitate toward"
}`
      }]
    })

    const match = response.content[0].text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { skills: [], roles: [], companies: [], industries: [], summary: '' }
  } catch (err) {
    console.warn('[LinkedIn] Failed:', err.message)
    return { skills: [], roles: [], companies: [], industries: [], summary: '' }
  }
}
