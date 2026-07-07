# Hivemind — Shared Project Memory

> Most project memory is a pile of stale notes. Hivemind makes it a living graph that knows how decisions relate, corrects itself when they change, and tells you who's affected.

**Hackathon brief:** [PROBLEM_STATEMENT.md](./PROBLEM_STATEMENT.md)

---

## What it does

- **Team graph** — each person joins via a shared link, connects their GitHub, LinkedIn, and personal website; Claude builds a complete profile and the graph populates live
- **Overlap discovery** — Claude reasons over all profiles together to find meaningful intersections, not just shared tags
- **Self-correction** — type a new decision; the old one greys out with a strikethrough and a `SUPERSEDES` edge links them
- **Realtime sync** — everyone shares one brain, changes appear live on all screens via Butterbase
- **Dependency inference** — "who do I need to warn?" traverses the graph and names the people who own downstream components

---

## Flow

```
Create session → get shareable link
Teammate clicks link → onboarding (name, GitHub, LinkedIn, website, interests)
                     → Claude scrapes + synthesizes a complete builder profile
                     → Person + Skill + Domain nodes appear on graph live
                     → overlaps computed across all team members

Choose mode on entry:
  BRAINSTORM → team profile graph, overlap discovery, build direction suggestions
  PROJECT    → decision graph, SUPERSEDES, dependency inference, notify
```

---

## Stack

| Layer | Technology | Role |
|---|---|---|
| Graph brain | **Neo4j Aura** | Session-scoped graph — people, skills, domains, overlaps, decisions, components |
| Auth + realtime | **Butterbase** | Email/password auth + realtime `graph_events` table syncs all clients live |
| Extraction pipeline | **RocketRide** | Decision extraction pipeline: utterance → `{ intent, component, tech }` |
| Profile synthesis | **Claude + scraping** | GitHub API, LinkedIn scrape, website scrape → complete builder profile |
| Frontend | React + react-force-graph-2d | Blueprint aesthetic, orthogonal edges, two-tab layout |

---

## Setup

### Butterbase (do this first)

1. Sign up at [dashboard.butterbase.ai](https://dashboard.butterbase.ai/) and redeem promo code `ENJOY0707`
2. Create an app → copy **App ID**, **API key**, and **anon key**
3. Fill env files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
4. Bootstrap schema + payments:
   ```bash
   cd backend && npm install && npm run setup:butterbase
   npm run setup:billing   # Stripe Connect + Team Pass product
   ```
5. Verify: `curl http://localhost:3001/health` → `butterbase.ok: true` and `rocketride` status

**Payments flow:** Session creators unlock a **Hivemind Team Pass** (free $0 checkout via Butterbase Payments / Stripe) before creating a hivemind. Teammates join free via the shared link.

### RocketRide (Person D — see [rocketride/README.md](./rocketride/README.md))

1. Deploy `rocketride/hivemind-decision-extract.pipe` to [RocketRide Cloud](https://cloud.rocketride.ai/)
2. Add `ROCKETRIDE_URI`, `ROCKETRIDE_APIKEY`, `ROCKETRIDE_ANTHROPIC_KEY` to `backend/.env`
3. Restart backend — `POST /event` uses RocketRide first, falls back to local Anthropic

### Full stack

```bash
# Neo4j — create free instance at neo4j.com/cloud/aura

# Backend
cd backend
cp .env.example .env
npm install
npm run setup:butterbase
npm run dev

# Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
# open localhost:5173
```

---

## Graph Schema

**Nodes:** `Session` · `Person {name, archetype, synthesis, strongest_in, curious_about}` · `Skill` · `Domain` · `Overlap {label, intersection, build_direction}` · `Component` · `Decision {text, ts, deprecated}`

**Edges:** `IN_SESSION` · `HAS_SKILL` · `INTERESTED_IN` · `OVERLAPS_WITH` · `OWNS` · `MADE` · `ABOUT` · `SUPERSEDES` · `DEPENDS_ON`

---

## API

- `POST /session` — create session, returns `{ sessionId }`
- `POST /session/:id/join` — ingest profile, triggers overlap recompute, broadcasts `graph_update`
- `GET /graph/brainstorm/:sessionId` — Person + Skill + Domain + Overlap nodes
- `GET /graph/project/:sessionId` — Person + Component + Decision nodes
- `POST /graph/brainstorm/:sessionId/overlaps` — recompute overlaps across all profiles
- `POST /event/:sessionId` — `{ text, author }` → extract intent → write to Neo4j → broadcast

---

## Sponsor Story

- **Neo4j** — the session-scoped graph powers both tabs: skill/domain traversal on the brainstorm side, and temporal `SUPERSEDES` edges + multi-hop dependency inference on the project side. Everything that's hard or impossible in a flat DB.
- **Butterbase** — auth gates the app; inserts into `graph_events` on every write so all open browsers refetch instantly. The two-laptop join moment is Butterbase. **Payments:** Team Pass checkout via Butterbase Payments (Stripe Connect).
- **RocketRide** — decision extraction pipeline: freeform utterance → structured `{ intent, component, tech }` → correct Neo4j operation.

---

## Fallback Ladder

1. GitHub scrape slow → self-reported interests still populate the graph
2. LinkedIn blocked → skip, profile still built from GitHub + website + interests
3. Extraction flaky → use `CANNED` fallbacks in `backend/agents/extractor.js`
4. Realtime flaky → `useRealtime.js` falls back to polling every 2s automatically
5. **Always-working core:** two people join via shared link, their nodes appear on each other's screen live. Protect this above all else.

---

**Team completion plan:** [SCOPE.md](./SCOPE.md)
