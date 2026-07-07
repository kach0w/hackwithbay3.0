# Person A — Neo4j graph layer (two-tab scope) — COMPLETE

Owns `backend/lib/neo4j.js` + the session seed. Graph is **session-scoped**
(`-[:IN_SESSION]->(:Session)`), feeding two tabs:
- **PROJECT** — `Person / Component / Decision`; supersede + dependency inference.
- **BRAINSTORM** — `Person / Skill / Domain / Overlap`; profile / expertise graph.

## All done — verified live against Aura (`npm run check`)
- **Aura connect fix** — driver reads `NEO4J_USERNAME`/`NEO4J_DATABASE` (Aura's
  download-file field names), not just `NEO4J_USER`. *Was blocking the whole team.*
- **`supersedeDecision`** — retires only the newest live decision, session-scoped
  (no deprecate-all, no duplicate nodes, no cross-session bleed).
- **`inferAffected`** — returns `{ notifyId, notify, affectedIds, affected }`; the
  `*Id`s match `person_`/`comp_` node ids so the PROJECT highlight fires
  (`ProjectView` updated to highlight by id).
- **`seedProjectSession`** — people, components, **OWNS + DEPENDS_ON** (nothing
  else created these → inference was empty), and a live `d_pg` decision to
  supersede on stage. Idempotent.
- **`seedBrainstormSession`** — full 4-person team with skills/domains + 3
  **Overlap** nodes (mirrors `agents/ingestion/overlap.js`, so seeded and
  live-computed graphs render identically). Edit the `team` array for real names.
- **Component-name seam locked** — `normalizeComponent()` maps `"the user
  service"`, `"user_service"`, `"USER-SERVICE"` → `user-service` on the write
  side, applied in `addDecision` / `supersedeDecision` / `inferAffected`. No
  silent no-ops regardless of what the extractor returns.
- **Demo session pre-seeded** — id **`demo`**, both tabs
  (`npm run seed -- demo both`, already run). Login lands on a full graph.
- Tooling: `npm run seed -- <sessionId> project|brainstorm|both`, `npm run check`.

## Opt-in, not default
The pre-seed is opt-in via the seed CLI — it does **not** run in the live
onboarding path. Real teammates joining still ingest normally; the seed is for
demo / "form a brain on entry."

## Not Person A (flag to team — still open)
- Butterbase **payment** and **RocketRide Cloud deployment** — mandatory per the
  brief, still unimplemented.
