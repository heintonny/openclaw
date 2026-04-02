#!/bin/bash
# Deploy the fork to this VPS
# Usage: bash scripts/deploy-fork.sh
set -euo pipefail

cd "$(dirname "$0")/.."
echo "🔄 Pulling latest..."
git pull origin feature/project-agent-flows

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "🔨 Building core..."
pnpm build

echo "🎨 Building UI..."
pnpm ui:build

echo "🔗 Linking globally..."
npm link

echo "🔄 Restarting gateway..."
mkdir -p ~/.config/systemd/user/openclaw-gateway.service.d/
cat << 'EOF' > ~/.config/systemd/user/openclaw-gateway.service.d/version.conf
[Service]
Environment="OPENCLAW_VERSION=2026.4.2-fork"
EOF
systemctl --user daemon-reload
XDG_RUNTIME_DIR=/run/user/0 systemctl --user restart openclaw-gateway
sleep 2

echo "✅ Deployed $(openclaw --version 2>&1)"
