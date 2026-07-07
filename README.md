# Hivemind

**Shared project memory that thinks in relationships — not rows.**

Most teams lose context in Slack threads, stale docs, and forgotten decisions. Hivemind turns your team into a **living knowledge graph**: profiles that build themselves, overlaps that emerge from real work, decisions that version themselves, and dependency chains that tell you exactly who to ping when something changes.

Built for **[HackwithBay 3.0](https://dashboard.butterbase.ai/)** — a graph-aware agentic app powered end-to-end by **Neo4j**, **Butterbase**, and **RocketRide Cloud**.

**Live demo:** [hivemind.butterbase.dev](https://hivemind.butterbase.dev) · **5-min script:** [DEMO.md](./DEMO.md)

---

## Why it matters

| The problem | What Hivemind does |
|---|---|
| "Who on this team actually knows X?" | Scrapes GitHub, LinkedIn, and personal sites → synthesizes builder profiles → maps skills and domains on a shared graph |
| "What should we build together?" | Claude reasons over *real project READMEs*, not generic tags, to surface meaningful overlaps and build directions |
| "We changed our mind — who did we tell?" | Decisions live in Neo4j with temporal `SUPERSEDES` edges; old ones grey out, new ones link forward |
| "Who gets burned if we change user-service?" | Multi-hop `DEPENDS_ON` traversal names the owners of every downstream component |

---

## The two-laptop moment

This is the demo. Two people, two browsers, one shared brain.

```
Host creates session → copies link → Teammate joins in incognito
Both pick BRAINSTORM → person nodes appear live on both screens
Skills populate from GitHub in ~5 seconds → RECOMPUTE OVERLAPS → golden overlap nodes bloom
Switch to PROJECT → type a decision → it syncs instantly
Type "who needs a heads up about user-service changing" → graph highlights affected owners
```

That realtime sync is **Butterbase**. The supersede chain and blast-radius query are **Neo4j**. The utterance → structured intent pipeline is **RocketRide Cloud**.

---

## Architecture

```mermaid
flowchart LR
  subgraph clients["Clients"]
    A[Browser A]
    B[Browser B]
  end

  subgraph butterbase["Butterbase"]
    Auth[Auth + Team Pass]
    RT[Realtime graph_events]
  end

  subgraph backend["Hivemind Backend"]
    API[Express API]
    Ingest[Profile Ingestion]
    Extract[Decision Extractor]
  end

  subgraph graph["Neo4j Aura"]
    Brain[Brainstorm Graph]
    Proj[Project Graph]
  end

  subgraph pipeline["RocketRide Cloud"]
    Pipe[hivemind-decision-extract]
  end

  A & B --> Auth
  A & B <-->|live sync| RT
  A & B --> API
  API --> Ingest --> Brain
  API --> Extract --> Pipe
  Extract --> Proj
  API --> RT
  API <--> graph
```

---

## Features

### Brainstorm mode — find your team’s superpower

- **One-link onboarding** — share a URL; teammates join with name, GitHub, LinkedIn, and personal website
- **Automatic profile synthesis** — Claude + GitHub API + scraping builds a complete builder profile (archetype, skills, domains, synthesis)
- **Live graph population** — Person, Skill, and Domain nodes appear on everyone’s canvas as people join
- **Overlap discovery** — recomputes meaningful intersections from actual project work, with shared-skill fallbacks when LLM is unavailable

### Project mode — decisions that remember themselves

- **Natural-language input** — type what you'd say in standup; the system extracts `{ intent, component, tech }`
- **Self-correction** — superseding a decision greys out the old one with a strikethrough and draws a `SUPERSEDES` edge to the new
- **Dependency inference** — ask who needs a heads-up; Neo4j traverses `DEPENDS_ON` up to 3 hops and highlights affected owners on the graph
- **Resilient extraction** — RocketRide Cloud first, local Anthropic fallback, canned demo responses as last resort

### Built to survive demo day

| Layer | Fallback |
|---|---|
| GitHub scrape slow | Self-reported interests still populate the graph |
| LinkedIn blocked | Profile built from GitHub + website + interests |
| RocketRide unavailable | Local Anthropic extraction kicks in automatically |
| Realtime flaky | Polling every 4s keeps graphs in sync |
| **Non-negotiable core** | Two people join via link → nodes appear live on both screens |

---

## Sponsor integration

Every mandatory technology is load-bearing — not bolted on.

### Neo4j — the graph is the product

Session-scoped property graphs power both modes:

- **Brainstorm:** `Person` → `HAS_SKILL` → `Skill`, `INTERESTED_IN` → `Domain`, `OVERLAPS_WITH` between teammates
- **Project:** `Component` dependency tree, `Decision` nodes with `deprecated` flags, temporal `SUPERSEDES` chains, multi-hop `inferAffected()` via Cypher

### Butterbase — auth, realtime, and payments

- Email/password auth gates session creation
- Every graph write inserts into `graph_events` → all connected clients refetch instantly
- **Hivemind Team Pass** — free $0 checkout via Butterbase Payments (Stripe Connect) unlocks session creation; teammates join free via link

### RocketRide Cloud — production decision pipeline

[`rocketride/hivemind-decision-extract.pipe`](./rocketride/hivemind-decision-extract.pipe) runs on RocketRide Cloud:

```
freeform utterance → webhook → prompt → Anthropic → structured JSON → Neo4j write
```

Deployed to [cloud.rocketride.ai](https://cloud.rocketride.ai/) — not local-only. See [rocketride/README.md](./rocketride/README.md).

---

## Stack

| Layer | Technology | Role |
|---|---|---|
| Graph brain | **Neo4j Aura** | People, skills, domains, overlaps, decisions, components, dependency traversal |
| Auth + realtime + payments | **Butterbase** | Auth, `graph_events` sync, Team Pass checkout |
| Extraction pipeline | **RocketRide Cloud** | Utterance → `{ intent, component, tech }` in production |
| Profile synthesis | **Claude + scraping** | GitHub API, LinkedIn, website → builder profiles |
| Frontend | **React + react-force-graph-2d** | Blueprint aesthetic, orthogonal edges, two-tab layout |
| Backend | **Express + neo4j-driver** | Session API, ingestion agents, graph reconciliation |

---

## Quick start

### One-command demo (recommended)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Fill in env vars (see DEMO.md), then:
./scripts/local-demo.sh
# → http://localhost:5173
```

### Environment

| Variable | Purpose |
|---|---|
| `NEO4J_URI` / `NEO4J_PASSWORD` | Graph storage |
| `BUTTERBASE_APP_ID` / `BUTTERBASE_API_KEY` | Auth + realtime |
| `GITHUB_TOKEN` | Brainstorm skills from repos + READMEs |
| `ANTHROPIC_API_KEY` | Overlap recompute + extraction fallback |
| `ROCKETRIDE_URI` / `ROCKETRIDE_APIKEY` | Project tab decision extraction |

### Butterbase setup

1. Sign up at [dashboard.butterbase.ai](https://dashboard.butterbase.ai/) — promo code **`ENJOY0707`**
2. Create an app → copy App ID, API key, and anon key into env files
3. Bootstrap schema + billing:
   ```bash
   cd backend && npm install && npm run setup:butterbase
   npm run setup:billing
   ```
4. Verify: `curl http://localhost:3001/health` → `butterbase.ok: true`

### Full manual stack

```bash
# Neo4j — free tier at neo4j.com/cloud/aura

cd backend && cp .env.example .env && npm install && npm run setup:butterbase && npm run dev
cd frontend && cp .env.example .env && npm install && npm run dev
# open http://localhost:5173
```

---

## Graph schema

**Nodes:** `Session` · `Person {name, archetype, synthesis, strongest_in, curious_about}` · `Skill` · `Domain` · `Overlap {label, intersection, build_direction}` · `Component` · `Decision {text, ts, deprecated}`

**Edges:** `IN_SESSION` · `HAS_SKILL` · `INTERESTED_IN` · `OVERLAPS_WITH` · `OWNS` · `MADE` · `ABOUT` · `SUPERSEDES` · `DEPENDS_ON`

---

## API

| Endpoint | Description |
|---|---|
| `POST /session` | Create session → `{ sessionId }` |
| `POST /session/:id/join` | Ingest profile, recompute overlaps, broadcast `graph_update` |
| `GET /graph/brainstorm/:sessionId` | Person + Skill + Domain + Overlap nodes |
| `GET /graph/project/:sessionId` | Person + Component + Decision nodes |
| `POST /graph/brainstorm/:sessionId/overlaps` | Recompute overlaps across all profiles |
| `POST /event/:sessionId` | `{ text, author }` → extract intent → write to Neo4j → broadcast |
| `GET /health` | Butterbase + RocketRide connectivity check |

---

## Project structure

```
hackwithbay3.0/
├── backend/           Express API, Neo4j layer, ingestion agents, extractor
├── frontend/          React app — Landing, Onboarding, Brainstorm + Project views
├── rocketride/        Decision extraction pipeline (.pipe) for RocketRide Cloud
├── butterbase/        Schema definition for Butterbase tables
├── scripts/           local-demo.sh, demo-stack helpers
├── DEMO.md            5-minute judge demo script
└── PROBLEM_STATEMENT.md
```

---

## Hackathon submission

- **Promo code:** `ENJOY0707`
- **Slug:** `HackwithBay-0707`
- Submit via Butterbase agent: *"Submit my project to the hackathon. Submission code: ENJOY0707 Hackathon slug: HackwithBay-0707"*

---

## Team

Built in 48 hours at HackwithBay 3.0 — where graph databases, managed AI pipelines, and zero-DevOps backends collide.

**Problem brief:** [PROBLEM_STATEMENT.md](./PROBLEM_STATEMENT.md) · **Completion scope:** [SCOPE.md](./SCOPE.md)
