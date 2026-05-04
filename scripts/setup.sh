#!/usr/bin/env bash
# Einmaliges Setup: KV-Namespace + R2-Bucket anlegen.
# Voraussetzung: `npm install` wurde ausgefuehrt und `npx wrangler login` ist erfolgt.

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d node_modules ]; then
  echo "node_modules fehlt. Bitte zuerst 'npm install' ausfuehren." >&2
  exit 1
fi

echo "==> KV Namespace TARGETS anlegen..."
npx wrangler kv namespace create TARGETS || echo "(eventuell existiert bereits)"

echo
echo "==> R2 Bucket cf-dynamic-rule-audit anlegen..."
npx wrangler r2 bucket create cf-dynamic-rule-audit || echo "(eventuell existiert bereits)"

echo
echo "Naechste Schritte:"
echo "  1. KV-ID aus dem Output oben in wrangler.toml unter [[kv_namespaces]] id einsetzen"
echo "  2. ./scripts/seed-kv.sh ausfuehren um Demo-Targets zu schreiben"
echo "  3. npx wrangler deploy"
