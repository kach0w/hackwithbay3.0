import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You extract structured decisions from freeform project utterances.

Return ONLY valid JSON matching this shape:
{ "intent": "add|supersede|notify", "component": string, "tech": string, "author": string, "text": string }

intent rules:
- "add"       → new decision, no conflict with existing ones
- "supersede" → explicitly replaces/changes/switches an existing decision
- "notify"    → asking who needs a heads-up about a change (no new decision)

Few-shot examples:
Input: "we decided to use Redis for caching" by Alice
Output: {"intent":"add","component":"cache","tech":"Redis","author":"Alice","text":"Use Redis for caching"}

Input: "switching user-service from Postgres to Neo4j" by Shreeya
Output: {"intent":"supersede","component":"user-service","tech":"Neo4j","author":"Shreeya","text":"Switch user-service from Postgres to Neo4j"}

Input: "heads up, user-service is changing" by Shreeya
Output: {"intent":"notify","component":"user-service","tech":"","author":"Shreeya","text":"user-service is changing"}

Only return JSON. No explanation.`

export async function extract(text, author) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: SYSTEM,
    messages: [{ role: 'user', content: `Input: "${text}" by ${author}` }]
  })

  const raw = response.content[0].text.trim()
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Extraction failed: ${raw}`)
  return JSON.parse(match[0])
}

// Canned fallbacks for demo safety (section 9 of spec)
export const CANNED = {
  supersede: { intent: 'supersede', component: 'user-service', tech: 'Neo4j', author: 'Shreeya', text: 'Switch user-service from Postgres to Neo4j' },
  notify:    { intent: 'notify',    component: 'user-service', tech: '',      author: 'Shreeya', text: 'user-service is changing' },
  add:       { intent: 'add',       component: 'frontend',     tech: 'Vite',  author: 'Frank',   text: 'Use Vite for frontend bundling' }
}
