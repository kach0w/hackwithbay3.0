# Hivemind — Completion Scope (HackwithBay 3.0)

**Goal:** Ship a demo-ready prototype that satisfies all three mandatory sponsors (Butterbase, Neo4j, RocketRide Cloud) with a clean two-laptop team flow.

**Live URLs:** Frontend `https://hivemind.butterbase.dev` · Backend (host machine) · Neo4j Aura · RocketRide Cloud pipeline

---

## Status snapshot (main branch)

| Area | Owner | Status | Notes |
|------|-------|--------|-------|
| Butterbase auth + realtime | **Karthik (B)** | ✅ Done | App `app_prsz2jg4dat2`, `graph_events`, CORS for `.butterbase.dev` |
| Neo4j graph layer | **Shreeya (A)** | ✅ Merged | Session scope, seeds, supersede, inferAffected |
| Frontend UI | **Person C** | ✅ Mostly done | Landing auth, onboarding, brainstorm + project tabs |
| RocketRide pipeline | **Person D** | 🟡 Wire ready | `.pipe` + SDK in repo; **needs cloud deploy + env keys** |
| Butterbase payments | **Karthik (B)** | ❌ Not started | Mandatory for judging |
| Public backend URL | **Host** | ❌ Not started | Deployed frontend still points at `localhost:3001` |
| Hackathon submission | **Karthik (B)** | ❌ Not started | Promo `ENJOY0707`, slug `HackwithBay-0707` |

---

## Who does what (to finish)

### Karthik — Butterbase + integration lead (Person B)

**Done:** Auth, realtime, person IDs, frontend deploy, merge Person A work.

**Remaining (~2–3 hrs):**

1. **Butterbase payments** — add a minimal paywall or team upgrade flow (Stripe Connect via Butterbase billing). Even a $0 test checkout counts as "in active use."
2. **Share secrets** with host (Discord, not git): Butterbase keys, Neo4j creds if coordinating.
3. **Set `VITE_API_URL`** on frontend deploy to host's public backend URL; redeploy `hivemind.butterbase.dev`.
4. **Submit** to hackathon via Butterbase agent prompt when demo is stable.
5. **Optional:** Add `session_id` column to `graph_events` schema for cleaner realtime filtering.

---

### Shreeya — Neo4j (Person A)

**Done:** `person-a/graph-reconcile` merged into main (`PERSON_A.md`, seeds, component normalization).

**Remaining (~30 min):**

1. Confirm Aura creds work with `NEO4J_USERNAME` / `NEO4J_DATABASE` on host machine.
2. Run `npm run check -- <sessionId>` on host before demo.
3. **Demo script:** PROJECT tab — point out supersede + notify on `user-service` (seeded graph).
4. Close PR #2 on GitHub (merged).

---

### Person C — Frontend

**Done:** Blueprint UI, graph canvas, brainstorm side panel, auth flow.

**Remaining (~1–2 hrs):**

1. Pull latest `main`; verify onboarding + graph click-to-select works.
2. **Join loading UX** — show "Building profile (~30s)…" spinner during ingest (teammates see empty graph until done).
3. **Mode sync (nice-to-have)** — persist chosen tab in `sessionStorage` so refresh doesn't re-prompt mode select.
4. Smoke test on `https://hivemind.butterbase.dev` after `VITE_API_URL` is set.

---

### Person D — RocketRide Cloud

**Done in repo:** `rocketride/hivemind-decision-extract.pipe`, `backend/lib/rocketride.js`, extractor fallback ladder.

**Remaining (~2–3 hrs) — BLOCKING mandatory requirement:**

1. Install RocketRide VS Code extension.
2. Open `rocketride/hivemind-decision-extract.pipe` → validate/fix lanes in canvas.
3. **Deploy to [cloud.rocketride.ai](https://cloud.rocketride.ai/)** (not local-only).
4. Send host these env vars:
   ```bash
   ROCKETRIDE_URI=https://cloud.rocketride.ai
   ROCKETRIDE_APIKEY=<cloud key>
   ROCKETRIDE_ANTHROPIC_KEY=<anthropic key for pipe>
   # optional if cloud exposes HTTP webhook:
   ROCKETRIDE_HTTP_URL=<webhook url>
   ```
5. Verify: `curl localhost:3001/health` → `rocketride.ok: true`
6. Test PROJECT tab utterance: *"switching user-service from Postgres to Neo4j"*

See [rocketride/README.md](./rocketride/README.md) for full steps.

---

### Host friend — Run the stack

**Remaining (~1 hr):**

1. `git pull` on `main`.
2. Fill `backend/.env` + `frontend/.env` from team secrets.
3. `cd backend && npm install && npm run dev`
4. `cd frontend && npm install && npm run dev` (or use deployed frontend once `VITE_API_URL` set).
5. Expose backend publicly (ngrok / Cloudflare tunnel) and send URL to Karthik for frontend rebuild.
6. Create session → share `?s=<id>` link in Discord.

---

## Demo script (5 minutes)

1. **Landing** — sign in (Butterbase), create hivemind.
2. **Laptop A** — join, fill profile, wait for ingest → **BRAINSTORM** shows Person + skills.
3. **Laptop B** — open same `?s=` link, join as second person → nodes appear within ~2s (Butterbase realtime + poll).
4. **BRAINSTORM** — recompute overlaps, click a person, read synthesis panel (Neo4j).
5. **PROJECT** — show seeded components; type supersede utterance → old decision greys out (Neo4j SUPERSEDES).
6. Type *"heads up user-service is changing"* → notify highlights downstream owners (RocketRide extract → graph inference).
7. Mention: extraction runs on **RocketRide Cloud** in production (show `/health`).

---

## Fallback ladder (if something breaks live)

1. RocketRide down → local Anthropic extractor (same JSON shape).
2. Anthropic down → CANNED responses in `extractor.js` (supersede/notify/add keywords).
3. Butterbase realtime down → 2s polling still refreshes graphs.
4. Slow GitHub scrape → interests-only profile still works.

**Protect:** two laptops, one session link, nodes appearing on both screens.

---

## Judging checklist

- [ ] Butterbase: auth in use ✅ · database (`graph_events`) ✅ · **payments** ❌
- [ ] Neo4j: session-scoped graph, Cypher traversal, supersede + inference ✅
- [ ] RocketRide: pipeline deployed to **cloud**, backend calls it in production 🟡
- [ ] Deep integration: all three in core PROJECT flow, not bolted on
- [ ] Working prototype + repo link + description mentioning all three

---

## Commands cheat sheet

```bash
git pull
cd backend && npm install && npm run setup:butterbase   # once
cd backend && npm run dev
cd frontend && npm run dev

npm run check -- <sessionId>          # Neo4j + Butterbase health
npm run seed -- demo both             # optional full demo without live ingest
curl http://localhost:3001/health     # + rocketride status
```

---

*Last updated after RocketRide wiring + Person A merge on `main`.*
