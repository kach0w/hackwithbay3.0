# RocketRide — Hivemind decision extraction (Person D)

Hivemind's **PROJECT** tab sends freeform utterances like *"switching user-service from Postgres to Neo4j"* through this pipeline. Output is structured JSON:

```json
{ "intent": "add|supersede|notify", "component": "user-service", "tech": "Neo4j", "author": "Shreeya", "text": "..." }
```

## Pipeline file

`hivemind-decision-extract.pipe` — webhook → prompt → Anthropic Haiku → text response.

Open it in the **RocketRide VS Code extension** to validate lanes, tweak the prompt, and deploy.

## Deploy to RocketRide Cloud (mandatory for judging)

1. Install the [RocketRide VS Code extension](https://marketplace.visualstudio.com/items?itemName=rocketride-org.rocketride)
2. Sign in at [cloud.rocketride.ai](https://cloud.rocketride.ai/)
3. Open `hivemind-decision-extract.pipe` → fix any lane warnings in the canvas
4. **Deploy** to RocketRide Cloud from the Connection Manager
5. Copy your **cloud URI**, **API key**, and (if exposed) **HTTP webhook URL**

## Wire into Hivemind backend

Add to `backend/.env`:

```bash
# Option A — SDK (recommended once pipe is deployed to cloud)
ROCKETRIDE_URI=https://cloud.rocketride.ai
ROCKETRIDE_APIKEY=your_cloud_api_key
ROCKETRIDE_PIPELINE=../rocketride/hivemind-decision-extract.pipe
ROCKETRIDE_ANTHROPIC_KEY=your_anthropic_key   # substituted into the pipe at runtime

# Option B — HTTP webhook (if cloud gives you a direct POST URL)
ROCKETRIDE_HTTP_URL=https://your-deployed-pipeline-webhook-url
```

Restart the backend. `POST /event/:sessionId` will call RocketRide first; if unavailable it falls back to local Anthropic, then CANNED demo responses.

## Verify

```bash
cd backend
npm run check                    # Neo4j + Butterbase
node -e "
import 'dotenv/config'
import { checkConnection } from './lib/rocketride.js'
checkConnection().then(console.log)
"
```

Test utterance in the app PROJECT tab:

- `switching user-service from Postgres to Neo4j` → **supersede**
- `heads up user-service is changing` → **notify** (highlights downstream owners)

## Local dev (without cloud)

```bash
# Run RocketRide engine locally (Docker)
docker pull ghcr.io/rocketride-org/rocketride-engine:latest
docker run --rm -p 5565:5565 ghcr.io/rocketride-org/rocketride-engine:latest

# backend/.env
ROCKETRIDE_URI=ws://localhost:5565
ROCKETRIDE_APIKEY=local-dev-key
ROCKETRIDE_ANTHROPIC_KEY=sk-ant-...
```

## Owner

**Person D** — build, deploy, and share `ROCKETRIDE_URI` + `ROCKETRIDE_APIKEY` (and optional `ROCKETRIDE_HTTP_URL`) with the host.
