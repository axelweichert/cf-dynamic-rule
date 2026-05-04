#!/usr/bin/env bash
# Liest targets/seed.json und schreibt jeden Eintrag als KV-Key "targets:<id>"
# Voraussetzung: wrangler ist eingeloggt, KV-Binding TARGETS in wrangler.toml gesetzt.

set -euo pipefail

SEED_FILE="$(dirname "$0")/../targets/seed.json"

if [ ! -f "$SEED_FILE" ]; then
  echo "Seed-Datei nicht gefunden: $SEED_FILE" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq wird benoetigt." >&2
  exit 1
fi

count=$(jq 'length' "$SEED_FILE")
echo "Seede $count Targets nach KV (Binding: TARGETS)..."

for i in $(seq 0 $((count - 1))); do
  entry=$(jq -c ".[$i]" "$SEED_FILE")
  id=$(echo "$entry" | jq -r '.id')
  key="targets:${id}"
  echo "  -> $key"
  echo "$entry" | wrangler kv key put --binding=TARGETS "$key" --remote
done

echo "Fertig."
