#!/usr/bin/env bash
# Creates .env from .env.example with a random TOTP_ENCRYPTION_KEY and a random first-admin
# password, and creates the folders Docker mounts. Safe to re-run: an existing .env is left alone.
set -euo pipefail
cd "$(dirname "$0")/.."

rand_hex() {
  if command -v openssl >/dev/null 2>&1; then openssl rand -hex "$1"
  else node -e "process.stdout.write(require('crypto').randomBytes($1).toString('hex'))"; fi
}

mkdir -p state papers

if [ -f .env ]; then
  echo ".env already exists, leaving it unchanged."
  exit 0
fi

key="$(rand_hex 32)"
password="$(rand_hex 12)"
sed -e "s/^TOTP_ENCRYPTION_KEY=.*/TOTP_ENCRYPTION_KEY=${key}/" \
    -e "s/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=${password}/" \
    .env.example > .env
chmod 600 .env

echo "Created .env with a random TOTP_ENCRYPTION_KEY."
echo "First admin: $(grep '^ADMIN_EMAIL=' .env | cut -d= -f2) / ${password}"
echo "Change ADMIN_EMAIL in .env first if you like, then: docker compose up -d --build"
