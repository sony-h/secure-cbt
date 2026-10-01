#!/usr/bin/env bash
# ── Secure CBT One-Click Update Script for VPS ─────────────────
# Usage: ./deploy/update.sh

set -euo pipefail

echo "=========================================================="
echo "🔄 Updating Secure CBT Platform..."
echo "=========================================================="

# 1. Fetch latest git changes
echo "📥 Pulling latest git changes..."
git pull

# 2. Update dependencies
echo "📦 Installing workspace dependencies..."
pnpm install

# 3. Migrate database
echo "🗄️ Running database migrations..."
pnpm --filter @secure-cbt/backend db:migrate:prod

# 4. Build all projects
echo "🏗️ Building shared library, backend, and dashboard..."
pnpm run build

# 5. Reload PM2 processes gracefully
echo "♻️ Reloading PM2 processes (zero-downtime)..."
pm2 reload ecosystem.config.cjs --update-env

echo "=========================================================="
echo "✅ Update deployed successfully!"
echo "Check status with: pm2 status"
echo "Check logs with:   pm2 logs"
echo "=========================================================="
