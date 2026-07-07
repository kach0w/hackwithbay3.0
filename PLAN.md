# Hivemind — Gaps, Fixes & Detailed Work Split

Review of the current scaffold against `hivemind_build_spec.md`, with fixes assigned per person and demo-day answers to have ready. Written 11:5x; deadline **16:30**, feature freeze **15:10**.

## Scope verdict

The scaffold is **on-scope**. README, the four contracts, the Cypher in `backend/lib/neo4j.js`, and `seed.cypher` all match the build spec. What's missing is (a) three correctness bugs that break beats on stage, (b) the Butterbase realtime + auth layer (the $200 track — currently a poll stub with no login), and (c) the viz animations that are 40% of the score.

**Protect order (fake from the top, defend to the death at the bottom):**
1. Live LLM extraction → fake first (canned JSON) the moment it wobbles.
2. Realtime → runs on a 2s poll as the *default*, Butterbase push as an optimization on top.
3. Inference → precompute the `user-service` fan-out if the traversal misbehaves.
4. **Seeded graph + supersede → never cut. This is the demo floor.**

---

## Blocker bugs (fix these first — they break the demo)

### B1 — Wrong Anthropic SDK package  ·  owner: D (+B)  ·  `backend/package.json`
`dependencies` lists `"anthropic": "^0.24.0"`, but `extractor.js` does `import Anthropic from '@anthropic-ai/sdk'`. Wrong package → import fails at runtime.
**Fix:** replace the dep with `"@anthropic-ai/sdk": "^0.30.0"` and re-run `npm install`.

### B2 — Inference highlight never fires (the strongest beat is dead)  ·  owner: A (+C)  ·  `backend/lib/neo4j.js`
`inferAffected` returns people/component **names** (`"Frank"`, `"auth-service"`). `App.jsx` puts those in `highlightIds`. But `fetchGraph` sets each node's `id` to `n.properties.id || n.elementId` — Person/Component nodes have no `id` property, so their `id` becomes the opaque Neo4j `elementId`. `highlightIds.includes(node.id)` therefore never matches, and the inference path lights up nothing.
**Fix (one line):** in `fetchGraph`, make node id human-readable and stable:
```js
id: n.properties.id || n.properties.name || n.elementId,
```
Do the same for the `m` node. Now Person id = `"Frank"`, Component id = `"auth-service"`, Decision id = `"d_pg"` (already has `id`), edges stay consistent (they reference `nodesMap[...].id`), and the highlight matches. Verify: `POST /event {text:"heads up, user-service is changing"}` → Frank/Ryan/Priya + their components pulse.

### B3 — CANNED fallback is exported but never used  ·  owner: D (+B)  ·  `backend/routes/event.js`, `backend/agents/extractor.js`
`extractor.js` exports `CANNED` but `event.js` calls `extract()` with no fallback, and `extract()` throws on any parse failure → `/event` returns 500 on stage. README claims the fallback exists.
**Fix:** add an env toggle + try/catch so a wobble degrades instead of crashing:
```js
// event.js
import { extract, CANNED } from '../agents/extractor.js'
...
let extracted
if (process.env.USE_CANNED === '1') {
  extracted = CANNED[classifyIntent(text)]  // or a fixed map of the 3 demo utterances
} else {
  try { extracted = await extract(text, author) }
  catch { extracted = CANNED.supersede }     // last-ditch: never 500 on stage
}
```
Flip `USE_CANNED=1` in `.env` if the live model gets flaky. Judges can't tell.

---

## High-value gaps

### G1 — Extraction not constrained to the seeded component names (silent no-op)  ·  owner: D + A
The extractor can return `component: "the user service"` / `"cache"` (its own few-shot even uses `cache`, which isn't seeded). `addDecision`/`supersedeDecision` `MATCH` on exact `name`; a miss creates **nothing** and shows no error — the worst failure mode.
**Fix (don't build a fuzzy resolver — shrink the input space):**
- In `extractor.js` SYSTEM prompt, closed-set it: `component MUST be exactly one of: frontend, auth-service, user-service, matching-engine, payments, notifications`.
- Add a cheap normalize (`lowercase`, strip spaces/hyphens) as a second layer.
- **D and A must agree the exact 6 strings out loud** — this is the Contract-4/seed seam. If D trains few-shots on `user-service` and A seeds `userService`, the demo dies silently.

### G2 — Butterbase realtime + auth is unbuilt (the $200 track)  ·  owner: B
`useRealtime.js` is a 2s poll stub; `butterbase.js` `broadcast()` hits a **guessed** REST path; there is **no login/auth gating** anywhere despite the README claiming email/password auth gates the app.
**Plan:**
- Keep the poll as the **default transport** (already correct in `useRealtime.js`) — this is the fallback ladder made load-bearing, so realtime can never embarrass you on stage.
- Add Butterbase email/password login that gates `App`. This alone satisfies "auth gates the app."
- Wire the real Butterbase channel client in `useRealtime.js` (replace the TODO). If push lands, great; if not, the poll already covers it — identical on stage.
- Never demo two laptops on venue wifi. Both on a tested hotspot.

### G3 — Viz animations incomplete (40% of the score)  ·  owner: C  ·  `frontend/src/components/GraphCanvas.jsx`
Deprecated rendering (grey + strikethrough + timestamp) is done. Missing: (1) new-node **fade + scale-in**, (2) the highlight is a **static** red ring, spec says **pulse**.
**Fix:** track node "age" on load and ease alpha/scale for ~600ms; drive the highlight ring radius/alpha off `performance.now()` in the `nodeCanvasObject` for a pulse. This is the visible polish judges score.

### G4 — `supersede` retires ALL live decisions about a component  ·  owner: A  ·  `backend/lib/neo4j.js`
`MATCH (old:Decision)-[:ABOUT]->(c) WHERE old.deprecated=false` matches every live decision; with >1 it deprecates all and `CREATE (new…)` runs once per matched row (duplicate new nodes with the same `id`). Fine for the seed (user-service has one live decision), fragile if you add more. **Fix if time:** `WITH old ORDER BY old.ts DESC LIMIT 1` before creating `new`.

### G5 — `owner` never populated (minor)  ·  owner: A
`fetchGraph` reads `n.properties.owner`, but ownership is the `(:Person)-[:OWNS]->(:Component)` edge, so `owner` is always null. Frontend doesn't use it yet — only fix if a label needs it.

---

## Detailed work split (rest of the day)

### Person A — Graph & Cypher
- [ ] **B2**: human-readable node ids in `fetchGraph` (unblocks the inference highlight). *Highest leverage single fix.*
- [ ] **G1**: agree the 6 canonical component strings with D, out loud.
- [ ] **G4**: bound `supersede` to the newest live decision (if time).
- [ ] Confirm `seed.cypher` re-runs clean after `MATCH (n) DETACH DELETE n`.
- **Accept:** seeded graph loads; supersede flips `deprecated`; inference returns Frank/Ryan/Priya for `user-service`.

### Person B — Backend API & Butterbase
- [ ] **B1**: fix the SDK dependency; `npm install`; `GET /graph` and `POST /event` both 200.
- [ ] **B3** (with D): wire the CANNED fallback + `USE_CANNED` toggle so `/event` never 500s.
- [ ] **G2**: Butterbase login gating `App`; real channel client in `useRealtime.js`; keep the 2s poll as default.
- **Accept:** two browsers stay in sync (poll or push); login gates the app; a write on one appears on the other.

### Person C — Frontend viz
- [ ] **G3**: new-node fade+scale-in; make the inference highlight actually pulse.
- [ ] Consume B2's ids — verify the inference path lights the right nodes end-to-end.
- [ ] Polish: legend, deprecated styling (done), layout so the seeded brain looks full on login.
- **Accept:** seeded graph renders clean; typing a decision animates a new node; deprecated items look retired; inference pulses the affected people; two windows sync.

### Person D — Extraction + demo
- [ ] **G1**: closed-set the extractor to the 6 component names + normalize; agree strings with A.
- [ ] **B1/B3** (with B): SDK dep + CANNED wiring. Model note: `claude-sonnet-4-6` (current code) works; `claude-haiku-4-5` is cheaper/faster for this classification if you want it.
- [ ] Map the **3 scripted utterances → canned Contract-4 JSON** as the demo-safe path.
- [ ] Own the demo: seed content, rehearse the 2-min script, **record a backup video by 15:10**.
- **Accept:** the 3 demo utterances return correct JSON; backup recording exists.

---

## Demo-day answers to have ready (from the grill)

**"Notion can strikethrough a row and add a 'superseded_by' link — what does your graph do that mine can't?"**
Don't say "it's an edge with a timestamp" (Notion relation columns do that). Say: *"In Notion a human has to remember the Postgres decision exists, find the row, strike it, and wire the link — the bookkeeping everyone stops doing by week three, which is why docs go stale. I type one sentence and it knew there was a live decision about that same component, retired it, and linked the supersession. Nobody hunted for the stale row. The graph corrects itself."* Self-maintaining memory, not "I have edges."

**"Where's the realtime sync?" / laptop B is stale on stage:**
You have no hole — the poll updates B within 2s and looks identical to push. Beforehand: poll is the default transport, both laptops on a tested hotspot, backup video recorded. On stage if B lags: keep talking about laptop A for a beat (buys the poll its 2s); if truly dead, click refresh on B — a manual refetch still proves shared state, which is the only thing a judge can see.

**"So is the extraction real?"**
Yes — one LLM call, closed-set to our components. If it wobbles we flip `USE_CANNED=1` and the 3 scripted utterances map to fixed JSON; you type known text on stage so it can't miss the component.

**The one trap (spec §245):** it must **connect and correct**, not just store notes. Keep supersede (auto-retire) and inference (traverse to who's affected) sacred — those are the two things a Notion doc physically can't do.
