#!/usr/bin/env bash
# Start backend + public tunnel for the two-laptop Hivemind demo.
# Usage: ./scripts/demo-stack.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ Stopping anything on port 3001..."
fuser -k 3001/tcp 2>/dev/null || true
sleep 1

echo "→ Starting backend..."
cd "$ROOT/backend"
npm run dev &
BACKEND_PID=$!
sleep 2

if ! curl -sf http://localhost:3001/health >/dev/null; then
  echo "❌ Backend failed to start on :3001"
  kill $BACKEND_PID 2>/dev/null || true
  exit 1
fi
echo "✓ Backend ready on http://localhost:3001"

echo "→ Starting tunnel (localtunnel)..."
npx -y localtunnel --port 3001 2>&1 | while IFS= read -r line; do
  echo "$line"
  if [[ "$line" == *"your url is:"* ]]; then
    TUNNEL_URL=$(echo "$line" | awk '{print $NF}')
    echo ""
    echo "============================================"
    echo "TUNNEL: $TUNNEL_URL"
    echo "TEST:   curl $TUNNEL_URL/health"
    echo ""
    echo "Share links with ?api= so tunnel changes don't need redeploy:"
    echo "  https://hivemind.butterbase.dev/?api=$TUNNEL_URL"
    echo "  https://hivemind.butterbase.dev/?api=$TUNNEL_URL&s=<sessionId>"
    echo "============================================"
    echo ""
    sleep 2
    curl -sf "$TUNNEL_URL/health" && echo "✓ Tunnel health OK" || echo "⚠ Tunnel not responding yet"
  fi
done

wait $BACKEND_PID
