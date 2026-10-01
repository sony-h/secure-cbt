#!/usr/bin/env bash
# ── Secure CBT VPS Initial Provisioning Script (Ubuntu / Debian) ──
# Run on fresh VPS: bash deploy/setup-vps.sh

set -euo pipefail

echo "=========================================================="
echo "🚀 Secure CBT - Initial VPS Setup"
echo "=========================================================="

# 1. Update system packages
echo "📦 Updating apt packages..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw nginx certbot python3-certbot-nginx build-essential ca-certificates gnupg

# 2. Install Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sudo sh /tmp/get-docker.sh
    sudo usermod -aG docker "$USER"
    rm /tmp/get-docker.sh
    echo "✅ Docker installed successfully."
else
    echo "✅ Docker already installed."
fi

# 3. Install Node.js 22 LTS
if ! command -v node &> /dev/null || [[ $(node -v) != v22* ]]; then
    echo "🟢 Installing Node.js 22 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js $(node -v) installed."
else
    echo "✅ Node.js $(node -v) already installed."
fi

# 4. Install pnpm & PM2 globally
echo "📦 Installing pnpm & PM2 globally..."
sudo npm install -g pnpm@9 pm2@latest

# 5. Configure UFW Firewall
echo "🛡️ Configuring UFW Firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable

echo ""
echo "=========================================================="
echo "🎉 VPS Setup Completed Successfully!"
echo "Next steps:"
echo " 1. Configure DNS records (A record pointing to this VPS IP)"
echo " 2. Prepare .env files (see deploy/README_VPS.md)"
echo " 3. Start database: docker compose -f docker-compose.prod.yml up -d"
echo " 4. Build & start apps: pm2 start ecosystem.config.cjs"
echo "=========================================================="
