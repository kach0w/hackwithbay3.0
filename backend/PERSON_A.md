# Person A — Neo4j graph layer (two-tab scope)

Owns `backend/lib/neo4j.js` + the session seed. The graph is **session-scoped**
(every node `-[:IN_SESSION]->(:Session)`), feeding two tabs:
- **PROJECT** — `Person / Component / Decision`; supersede + dependency inference.
- **BRAINSTORM** — `Person / Skill / Domain / Overlap`; profile ingestion.

## Done (verified live against Aura — `npm run check`)
- **Aura connect fix** — driver now reads `NEO4J_USERNAME`/`NEO4J_DATABASE` (the
  fields Aura's download file uses), not just `NEO4J_USER`. *This was blocking the
  whole team — the app could not connect to Neo4j on `main`.*
- **`supersedeDecision`** — retires only the **newest** live decision, scoped to
  the session (no deprecate-all, no duplicate nodes, no cross-session bleed).
- **`inferAffected`** — now returns `{ notifyId, notify, affectedIds, affected }`.
  The `*Id` fields match the `person_`/`comp_` node ids so the PROJECT-tab
  highlight actually lights up (frontend `ProjectView` updated to use them).
- **`seedProjectSession(sessionId)`** — people, components, **OWNS + DEPENDS_ON**
  edges (nothing else created these, so inference returned `[]` without it), and a
  live `d_pg` decision to supersede on stage. Idempotent (MERGE).
- CLI: `npm run seed -- <sessionId> project|brainstorm|both` and `npm run check`.

## Left on Person A's plate
1. **[YOURS] BRAINSTORM pre-seed** — `seedBrainstormSession()` is a **starter
   stub** in `neo4j.js` (2 sample people + skills/domains). Make the brainstorm
   tab "form a brain" on entry instead of requiring live GitHub/LinkedIn
   ingestion: fill in the real team, and compute/seed **Overlap** nodes across
   members (shared skill/domain → build direction). Keep it MERGE-based. Wire it
   as an **option** (a demo toggle or the seed CLI), not the default onboarding
   path.
2. Pick a **demo session id** and pre-seed it before the run
   (`npm run seed -- demo both`) so login lands on a full graph.
3. Coordinate the component-name seam with the extraction owner: `component` must
   be exactly one of `frontend, auth-service, user-service, matching-engine,
   payments, notifications`, or decisions silently no-op.

## Not Person A (flag to the team)
- Butterbase **payment** and **RocketRide Cloud deployment** are mandatory per the
  brief and still unimplemented.
