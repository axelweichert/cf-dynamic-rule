#!/usr/bin/env bash
# Liest targets/seed.json und schreibt jeden Eintrag als KV-Key "targets:<id>"
# Voraussetzung: `npm install` und konfiguriertes wrangler.toml mit gueltiger KV-ID.

set -euo pipefail

cd "$(dirname "$0")/.."

SEED_FILE="targets/seed.json"

if [ ! -f "$SEED_FILE" ]; then
  echo "Seed-Datei nicht gefunden: $SEED_FILE" >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "node_modules fehlt. Bitte zuerst 'npm install' ausfuehren." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq wird benoetigt (apt install jq / brew install jq)." >&2
  exit 1
fi

count=$(jq 'length' "$SEED_FILE")
echo "Seede $count Targets nach KV (Binding: TARGETS)..."

for i in $(seq 0 $((count - 1))); do
  entry=$(jq -c ".[$i]" "$SEED_FILE")
  id=$(echo "$entry" | jq -r '.id')
  key="targets:${id}"
  echo "  -> $key"
  echo "$entry" | npx wrangler kv key put --binding=TARGETS "$key" --remote
done

echo "Fertig."
