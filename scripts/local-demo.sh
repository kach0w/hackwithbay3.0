#!/usr/bin/env bash
# Local two-browser Hivemind demo — no tunnel or deploy needed.
# Usage: ./scripts/local-demo.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$ROOT/backend/.env" ]; then
  echo "❌ Missing backend/.env — copy backend/.env.example and fill secrets"
  exit 1
fi

if [ ! -f "$ROOT/frontend/.env" ]; then
  echo "→ Creating frontend/.env from example..."
  cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env"
fi

echo "→ Stopping anything on :3001 / :5173..."
pkill -f "cloudflared tunnel" 2>/dev/null || true
pkill -f "node --watch index.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true
sleep 1

echo "→ Starting backend on http://localhost:3001"
cd "$ROOT/backend"
npm run dev &
sleep 2
if ! curl -sf http://localhost:3001/health >/dev/null; then
  echo "❌ Backend failed — check backend/.env (Neo4j, Butterbase, GITHUB_TOKEN)"
  exit 1
fi

HEALTH=$(curl -sf http://localhost:3001/health)
echo "   $(echo "$HEALTH" | node -pe "const h=JSON.parse(require('fs').readFileSync(0)); ['butterbase:'+(h.butterbase?.ok?'ok':'FAIL'), 'rocketride:'+(h.rocketride?.ok?'ok':'skip')].join(' | ')")"

echo "→ Starting frontend on http://localhost:5173"
cd "$ROOT/frontend"
npm run dev &
sleep 2
curl -sf http://localhost:5173 >/dev/null || { echo "❌ Frontend failed"; exit 1; }

echo ""
echo "============================================"
echo "  HIVEMIND DEMO READY"
echo "  App:  http://localhost:5173"
echo "  API:  http://localhost:3001"
echo ""
echo "  Demo flow (2 laptops / incognito):"
echo "  1. ENTER SERVICE → join with name + GitHub"
echo "  2. COPY LINK → open in incognito → different name"
echo "  3. BRAINSTORM → see team graph (wait ~5s for GitHub)"
echo "  4. RECOMPUTE OVERLAPS when 2+ people joined"
echo "  5. PROJECT → type a decision, watch graph update"
echo "============================================"
echo ""
wait
