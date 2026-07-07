# Hivemind — Shared Project Memory

> Most project memory is a pile of stale notes. Hivemind makes it a living graph that knows how decisions relate, corrects itself when they change, and tells you who's affected.

**Hackathon brief:** [PROBLEM_STATEMENT.md](./PROBLEM_STATEMENT.md)

---

## What it does

- **Team graph** — each person joins via a shared link, connects their GitHub and shares their interests, and their profile is ingested into a live graph showing the team's collective skills and domains
- **Self-correction** — type a new decision; the old one greys out with a strikethrough and a `SUPERSEDES` edge links them
- **Realtime sync** — everyone shares one brain, changes appear live on all screens (Butterbase)
- **Dependency inference** — "who do I need to warn?" traverses the graph and names the people who own downstream components (Neo4j)

---

## User Flow

```
Creator → POST /session → gets session ID
        → shares link: hivemind.app?s=abc123

Teammate clicks link
        → Onboarding form (name, GitHub, LinkedIn, Twitter, interests)
        → Profile ingested → Person node + Skill/Domain nodes appear on graph live
        → Lands on graph, sees full team

Anyone on the graph → types a decision → Claude extracts intent
        → add: new Decision node blooms
        → supersede: old Decision greys out + X + SUPERSEDES edge
        → notify: graph highlights who owns affected components
```

---

## Stack

| Layer | Technology | Role |
|---|---|---|
| Graph brain | **Neo4j Aura** | Stores people, skills, decisions, components — traverses dependency chains |
| Auth + realtime | **Butterbase** | Email/password auth + realtime `graph_events` table syncs all clients live |
| Extraction pipeline | **RocketRide** | Runs the utterance → structured decision pipeline (intent classification + LLM) |
| Profile ingestion | **Claude + GitHub API** | Extracts skills and domains from GitHub repos, stars, and self-reported interests |
| Frontend | React + react-force-graph-2d | Blueprint-aesthetic force-directed graph, Landing → Onboarding → Graph routing |

---

## Team Roles

### Person A — Neo4j Graph Layer
**Own:** `backend/lib/neo4j.js`, `backend/seed.cypher`

Session-scoped graph — every node is linked to a `Session` node so multiple teams don't bleed into each other.

Implement all graph operations:
1. `createSession(sessionId)` — create a new session node
2. `fetchGraph(sessionId)` — returns all nodes + edges scoped to this session
3. `addPerson / addSkillEdge / addDomainEdge` — build person profiles as they join
4. `addDecision / supersedeDecision` — decision lifecycle
5. `inferAffected(sessionId, component)` — multi-hop traversal: who owns things that depend on this?

**Acceptance:** two sessions don't share nodes; supersede flips `deprecated`; inference fans out correctly.

---

### Person B — Backend API + Butterbase Realtime
**Own:** `backend/routes/`, `backend/lib/butterbase.js`, `backend/index.js`

API layer: frontend → RocketRide extraction → Neo4j → Butterbase broadcast.

- `POST /session` — create session, return `{ sessionId }`
- `POST /session/:id/join` — ingest profile, broadcast `graph_update`
- `GET /graph/:sessionId` — return session graph (Contract 1)
- `POST /event/:sessionId` — extract intent, write to Neo4j, broadcast

Wire **Butterbase** for:
- Email/password auth via `AuthGate` (already scaffolded)
- Insert into `graph_events` table on every write → realtime subscription triggers refetch on all clients

**Acceptance:** two browsers stay in sync; joining triggers live graph update on other screens.

---

### Person C — Frontend Graph Visualization
**Own:** `frontend/src/`

Three-screen flow: Landing → Onboarding → Graph. Blueprint aesthetic throughout.

- **Landing** — create session or paste session ID to join
- **Onboarding** — name, GitHub, LinkedIn, Twitter, interests form; shows share link to copy
- **Graph** — blueprint force-directed graph with:
  - Person nodes (blue), Skill nodes (teal), Domain nodes (yellow), Decision nodes (white), Component nodes (green)
  - Deprecated nodes: greyed, X through box, timestamp below
  - Inference highlight: yellow pulsing border on affected nodes for 4s
  - COPY LINK button in header
  - `COMMIT` input at bottom for decisions

Subscribe to **Butterbase** `graph_events` realtime — refetch on every event (already wired in `useRealtime.js`).

**Acceptance:** joining via shared link goes straight to onboarding; graph builds live as teammates join; decisions animate correctly.

---

### Person D — RocketRide Extraction Pipeline + Demo
**Own:** `backend/agents/extractor.js` + `backend/agents/ingestion/` + demo script + backup video

Two pipelines on **RocketRide**:

**Pipeline 1 — Profile ingestion** (`backend/agents/ingestion/profile.js`)
- Takes GitHub username + interests text
- Calls GitHub API for repos + stars
- Claude extracts skills, domains, summary
- Writes to Neo4j via Person A's functions

**Pipeline 2 — Decision extraction** (`backend/agents/extractor.js`)
- Takes freeform utterance + author
- Returns `{ intent, component, tech, author, text }` (Contract 4)
- Three intents: `add`, `supersede`, `notify`
- Keep `CANNED` fallbacks for demo safety

Also own the demo: rehearse the join flow with two laptops, record backup video by 15:10.

**Acceptance:** GitHub ingestion populates skill/domain nodes; extraction returns correct intent for all 3 demo utterances.

---

## API Contracts

**Contract 1 — `GET /graph/:sessionId`**
```json
{
  "nodes": [
    { "id": "person_karthik", "type": "Person",    "label": "Karthik",      "skills": ["Python","Neo4j"], "deprecated": false },
    { "id": "skill_python",   "type": "Skill",     "label": "Python",       "deprecated": false },
    { "id": "d_pg",           "type": "Decision",  "label": "Use Postgres", "deprecated": true, "ts": "..." }
  ],
  "edges": [
    { "source": "person_karthik", "target": "skill_python", "type": "HAS_SKILL" },
    { "source": "d_pg",           "target": "c_user",       "type": "ABOUT",     "deprecated": true }
  ]
}
```

**Contract 2 — `POST /session/:id/join`**
```json
{ "name": "Karthik", "github": "kach0w", "linkedin": "...", "twitter": "...", "interests": "..." }
```

**Contract 3 — Butterbase realtime (`graph_events` table)**
```json
{ "author": "Karthik", "intent": "join", "component": null }
```

**Contract 4 — RocketRide extraction output**
```json
{ "intent": "supersede", "component": "user-service", "tech": "Neo4j", "author": "Karthik", "text": "..." }
```

---

## Graph Schema

**Nodes:** `Session {id}` · `Person {name, github, skills, domains, summary}` · `Skill {name}` · `Domain {name}` · `Component {name}` · `Decision {id, text, ts, deprecated}`

**Edges:** `IN_SESSION` · `HAS_SKILL` · `INTERESTED_IN` · `OWNS` · `MADE` · `ABOUT` · `SUPERSEDES` · `DEPENDS_ON`

---

## Setup

### Butterbase (do this first)

1. Sign up at [dashboard.butterbase.ai](https://dashboard.butterbase.ai/) and redeem promo code `ENJOY0707` in billing
2. Create an app → copy **App ID**, **API key**, and **anon key**
3. Fill env files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
4. Bootstrap schema + realtime:
   ```bash
   cd backend && npm install && npm run setup:butterbase
   ```
5. Verify: `curl http://localhost:3001/health` → `butterbase.ok: true`

### Full stack

```bash
# Neo4j — create free instance at neo4j.com/cloud/aura

# Backend
cd backend
cp .env.example .env   # fill in Neo4j, Butterbase, Anthropic, RocketRide keys
npm install
npm run setup:butterbase
npm run dev

# Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
# open localhost:5173
```

---

## Sponsor Story (say this to judges)

- **Neo4j** — the session-scoped team graph, skill/domain traversal, temporal `SUPERSEDES` edges, and multi-hop dependency inference. The textbook "why a graph" — a flat DB cannot answer "who do I need to warn?"
- **Butterbase** — auth gates the app; realtime `graph_events` table syncs every join and decision across all open browsers instantly. The two-laptop demo moment is Butterbase.
- **RocketRide** — two pipelines: profile ingestion (GitHub → skills → graph) and decision extraction (utterance → intent → Neo4j write). The intelligence layer.

---

## Fallback Ladder

1. GitHub ingestion slow → show self-reported interests only, graph still populates
2. Extraction flaky → use `CANNED` fallbacks in `extractor.js`
3. Realtime flaky → `useRealtime.js` falls back to polling every 2s automatically
4. Traversal hard → precompute inference answer for `user-service`
5. **Always-working core:** two people join via shared link, their nodes appear on each other's screen. Protect this above all else.
