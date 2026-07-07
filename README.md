# Hivemind — Shared Project Memory

> Most project memory is a pile of stale notes. Hivemind makes it a living graph that knows how decisions relate, corrects itself when they change, and tells you who's affected.

**Hackathon brief:** [PROBLEM_STATEMENT.md](./PROBLEM_STATEMENT.md)

---

## What it does

- **Self-correction** — type a new decision; the old one greys out with a strikethrough and a `SUPERSEDES` edge links them
- **Realtime sync** — two teammates share one brain, changes appear live on both screens (Butterbase)
- **Dependency inference** — "who do I need to warn?" traverses the graph and names the people who own downstream components (Neo4j)

---

## Stack

| Layer | Technology | Role |
|---|---|---|
| Graph brain | **Neo4j Aura** | Stores decisions, components, people, and traverses dependency chains |
| Auth + realtime | **Butterbase** | Email/password auth + realtime channel that syncs graph updates across all clients |
| Extraction pipeline | **RocketRide** | Runs the utterance → structured decision pipeline (intent classification + LLM extraction) |
| Frontend | React + react-force-graph-2d | Live force-directed graph with animations for new nodes, deprecated decisions, inference highlights |

---

## Team Roles

### Person A — Neo4j Graph Layer
**Own:** `backend/lib/neo4j.js`, `backend/seed.cypher`

Set up Neo4j Aura free instance. Implement the schema and all 4 graph operations:
1. `fetchGraph()` — returns full graph as `{ nodes, edges }` per Contract 1
2. `addDecision()` — creates a new Decision node linked to a Component and Person
3. `supersedeDecision()` — sets old decision `deprecated: true`, creates `SUPERSEDES` edge
4. `inferAffected()` — multi-hop traversal: who owns components that depend on the changed one?

Run `seed.cypher` in Neo4j Aura browser before the demo to pre-populate the graph.

**Acceptance:** seeded graph loads in browser; supersede flips `deprecated` flag; inference returns correct people.

---

### Person B — Backend API + Butterbase Realtime
**Own:** `backend/routes/`, `backend/lib/butterbase.js`, `backend/index.js`

Build the thin API layer tying frontend → RocketRide extraction → Neo4j → Butterbase broadcast.

- `GET /graph` — proxy Neo4j fetchGraph, return Contract 1 shape
- `POST /event` — receive `{ text, author }`, call RocketRide extraction pipeline (Contract 4), call the right Neo4j op, then broadcast `{ type: "graph_update", author }` on Butterbase channel `project:default`

Wire **Butterbase** for:
- Email/password auth (gate the app behind login)
- Realtime channel: publish `graph_update` on every write so all connected clients refetch

**Acceptance:** two browsers stay in sync; a write from one triggers an update on the other; login gates the app.

---

### Person C — Frontend Graph Visualization
**Own:** `frontend/src/`

Build the React SPA. This is 40% of the demo score — make it beautiful.

- Force-directed graph from `GET /graph` using `react-force-graph-2d`
- Node colors by type: Person (blue), Component (green), Decision (yellow)
- Three animations:
  1. New node fades + scales in
  2. `deprecated: true` nodes render greyed with strikethrough label + timestamp
  3. Inference highlight mode pulses red on affected node IDs for 4s
- Text input at the bottom POSTs to `POST /event`
- Subscribe to **Butterbase** realtime channel `project:default` — refetch graph on `graph_update`

**Acceptance:** seeded graph renders; typing a decision animates a new node; deprecated items look retired; two windows stay in sync without refresh.

---

### Person D — RocketRide Extraction Pipeline + Demo
**Own:** `backend/agents/extractor.js` + demo script + backup video

Build the extraction step as a **RocketRide pipeline**: given a freeform utterance, return Contract 4 JSON `{ intent, component, tech, author, text }`.

Three intents:
- `add` — new decision, no conflict
- `supersede` — replaces an existing decision
- `notify` — who needs a heads-up (no new decision created)

Use a tight system prompt with few-shot examples (see `extractor.js`). Deploy on RocketRide so Person B can call it as a pipeline endpoint rather than a direct LLM call. Keep `CANNED` fallbacks in the file for demo safety.

Also own the demo: finalize seed content, rehearse the 2-minute script, record a backup video by 15:10.

**Acceptance:** all 3 scripted demo utterances return correct intent JSON; backup recording exists.

---

## API Contracts

**Contract 1 — `GET /graph`**
```json
{
  "nodes": [
    { "id": "c_user", "type": "Component", "label": "user-service", "deprecated": false },
    { "id": "d_pg",   "type": "Decision",  "label": "Use Postgres", "deprecated": true, "ts": "..." }
  ],
  "edges": [
    { "id": "e1", "source": "d_pg", "target": "c_user", "type": "ABOUT", "deprecated": true }
  ]
}
```

**Contract 2 — `POST /event`**
```json
{ "text": "switching user-service from Postgres to Neo4j", "author": "Shreeya" }
```

**Contract 3 — Butterbase realtime (`project:default` channel)**
```json
{ "type": "graph_update", "author": "Shreeya" }
```

**Contract 4 — RocketRide extraction output**
```json
{ "intent": "supersede", "component": "user-service", "tech": "Neo4j", "author": "Shreeya", "text": "..." }
```

---

## Setup

```bash
# 1. Neo4j — create free instance at neo4j.com/cloud/aura
#    Paste seed.cypher in the Aura browser query box

# 2. Backend
cd backend
cp .env.example .env   # fill in Neo4j, Butterbase, Anthropic, RocketRide keys
npm install
npm run dev

# 3. Frontend
cd frontend
npm install
npm run dev
```

---

## Graph Schema

**Nodes:** `Person {name}` · `Component {name}` · `Decision {id, text, ts, deprecated}`

**Edges:** `OWNS` · `MADE` · `ABOUT` · `SUPERSEDES` · `DEPENDS_ON`

---

## Sponsor Story (say this to judges)

- **Neo4j** — the decision graph, temporal `SUPERSEDES` edges, and the multi-hop dependency traversal that finds who's affected. The textbook "why a graph."
- **Butterbase** — auth + the realtime channel that syncs one project brain across teammates live. Hard to fake on stage.
- **RocketRide** — the extraction pipeline that turns a freeform utterance into a structured decision with intent classification.

---

## Fallback Ladder

If something breaks during the demo, in order:
1. Extraction flaky → use `CANNED` fallbacks in `extractor.js`
2. Realtime flaky → frontend polls `GET /graph` every 2s (already wired in `useRealtime.js`)
3. Traversal hard → precompute inference answer for `user-service`
4. **Always-working core:** seeded graph + supersede beat. Protect this above all else.
