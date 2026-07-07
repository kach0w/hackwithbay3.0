#!/usr/bin/env bash
# Start backend + public tunnel for the two-laptop Hivemind demo.
# Usage: ./scripts/demo-stack.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CF="${CLOUDFLARED:-/tmp/cloudflared}"

echo "→ Stopping anything on port 3001..."
fuser -k 3001/tcp 2>/dev/null || true
pkill -f "localtunnel --port 3001" 2>/dev/null || true
pkill -f "cloudflared tunnel --url" 2>/dev/null || true
sleep 1

if [ ! -x "$CF" ]; then
  echo "→ Installing cloudflared..."
  curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o "$CF"
  chmod +x "$CF"
fi

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

echo "→ Starting tunnel (cloudflared)..."
"$CF" tunnel --url http://localhost:3001 2>&1 | while IFS= read -r line; do
  echo "$line"
  if [[ "$line" == *"trycloudflare.com"* ]]; then
    TUNNEL_URL=$(echo "$line" | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1)
    if [ -n "$TUNNEL_URL" ]; then
      echo ""
      echo "============================================"
      echo "TUNNEL: $TUNNEL_URL"
      sleep 3
      if curl -sf "$TUNNEL_URL/health" >/dev/null; then
        echo "✓ Tunnel health OK"
        echo "Publishing to Butterbase..."
        if npm run publish:api-url -- "$TUNNEL_URL"; then
          echo ""
          echo "Share: https://hivemind.butterbase.dev"
        fi
      else
        echo "⚠ Tunnel not ready yet — run when up:"
        echo "  cd backend && npm run publish:api-url -- $TUNNEL_URL"
      fi
      echo "============================================"
      echo ""
    fi
  fi
done

wait $BACKEND_PID
