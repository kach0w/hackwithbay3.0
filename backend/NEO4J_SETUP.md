# Person A — Neo4j graph layer

Owns: `backend/lib/neo4j.js`, `backend/lib/graph-shape.js`, `backend/seed.cypher`,
`backend/test/flatten.test.mjs`.

## What's done (code complete, DB-independent)
- **4 graph operations** in `lib/neo4j.js`: `fetchGraph` (Contract 1), `addDecision`,
  `supersedeDecision`, `inferAffected` — using the exact schema/Cypher from the spec.
- **B2 fix**: node ids are human-readable (`Person`→name, `Component`→name, `Decision`→`id`)
  so the inference query's `p.name`/`dep.name` and the frontend highlight key on the same
  ids. The flattening lives in `lib/graph-shape.js` (pure, unit-tested).
- **Supersede fix**: retires only the *newest* live decision (`ORDER BY ts DESC LIMIT 1`)
  so it can't deprecate-all / create duplicate nodes.
- **`verifyConnection()`** so a bad Aura URI fails at startup, not mid-demo.
- **Shape test**: `npm test` (in `backend/`) → passes without a live DB.

## The one step only you can do (~5 min): stand up Aura
1. Create a **free Neo4j Aura** instance at https://neo4j.com/cloud/aura-free/ → "New Instance".
2. Download / copy the generated password (shown once).
3. In `backend/.env` (copy from `.env.example`), set:
   ```
   NEO4J_URI=neo4j+s://xxxx.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=<the generated password>
   ```
4. Open the Aura **Query** tab, paste all of `seed.cypher`, run it. (Reset before the demo
   with `MATCH (n) DETACH DELETE n`, then re-paste.)

## Verify once the DB is live
```
cd backend && npm install && npm test        # shape test (no DB needed) — should PASS
```
Then, with `.env` filled and the graph seeded, from Person B's API (or a node REPL):
- `fetchGraph()` returns ~10 nodes / ~15 edges, all with human-readable ids.
- `supersedeDecision({id:'d_neo4j', text:'Switch user-service to Neo4j', component:'user-service', author:'Shreeya'})`
  → `d_pg.deprecated` flips to `true`, a `SUPERSEDES` edge appears.
- `inferAffected('user-service')` → returns Frank / Ryan / Priya (and the frontend chain)
  with their affected component names.

## Contract this layer returns (don't change — it's the glue)
`fetchGraph()` → `{ nodes: [{id,type,label,owner,deprecated,ts}], edges: [{id,source,target,type,deprecated}] }`
where `type ∈ Person | Component | Decision` and `deprecated:true` renders grey + strikethrough.

## The seam to lock with Person D
The extractor MUST return `component` as one of the exact seeded names:
`frontend, auth-service, user-service, matching-engine, payments, notifications`.
A mismatch makes `MATCH (c:Component {name:$component})` return zero rows → silent no-op.
