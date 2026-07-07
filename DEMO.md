# Hivemind — 5-minute local demo

## Start (one command)

```bash
./scripts/local-demo.sh
```

Open **http://localhost:5173**

## Prerequisites (`backend/.env`)

| Variable | Required for |
|---|---|
| `NEO4J_URI` / `NEO4J_PASSWORD` | Graph storage |
| `BUTTERBASE_APP_ID` / `BUTTERBASE_API_KEY` | Realtime sync |
| `GITHUB_TOKEN` | Brainstorm skills from repos + READMEs |
| `ANTHROPIC_API_KEY` | Overlap recompute + extraction fallback |
| `ROCKETRIDE_URI` / `ROCKETRIDE_APIKEY` | Project tab decision extraction |

Copy templates: `cp backend/.env.example backend/.env` and `cp frontend/.env.example frontend/.env`

## Demo script (judges / teammates)

### Act 1 — Two people join (Butterbase realtime)

1. **Host** (normal browser): ENTER SERVICE → name + GitHub → JOIN
2. Copy link from header → **Teammate** (incognito): paste link → different name + GitHub → JOIN
3. Both pick **BRAINSTORM** — person nodes appear live; skills populate in ~5s
4. Click **RECOMPUTE OVERLAPS** — overlap nodes appear

### Act 2 — Project decisions (Neo4j + RocketRide)

1. Switch to **PROJECT** tab
2. Type: `switching user-service from Postgres to Neo4j`
3. Old decision greys out, new one links via SUPERSEDES
4. Type: `who needs a heads up about user-service changing`
5. Dependency traversal highlights affected owners

## Troubleshooting

| Problem | Fix |
|---|---|
| Empty brainstorm skills | Add `GITHUB_TOKEN` to `backend/.env`, restart |
| Invalid request body on join | Hard-refresh; local demo skips auth on localhost |
| Teammate not on graph | Use incognito (separate identity per window) |
| RocketRide fails | Falls back to Anthropic automatically |

## Multi-machine (optional)

For deployed frontend, host runs tunnel + `npm run publish:api-url`. For hackathon demo, **local mode is recommended**.
