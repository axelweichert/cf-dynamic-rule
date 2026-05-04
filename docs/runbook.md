# Runbook

## Logs ansehen

```bash
wrangler tail
```

## Audit-Log lesen (R2)

```bash
wrangler r2 object get cf-dynamic-rule-audit/$(date -u +%F).jsonl
```

## Neuen Target hinzufuegen

1. `targets/seed.json` ergaenzen.
2. KV-Eintrag schreiben:
   ```bash
   echo '<JSON>' | wrangler kv key put --binding=TARGETS "targets:<id>" --remote
   ```
3. Commit + Push.

## Aktive Rules manuell pruefen

```bash
curl -H "Authorization: Bearer $CF_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/gateway/rules" \
  | jq '.result[] | select(.description | startswith("cf-dynamic-rule|"))'
```

## Notfall: Alle dynamischen Rules sofort entfernen

```bash
curl -H "Authorization: Bearer $CF_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/gateway/rules" \
  | jq -r '.result[] | select(.description | startswith("cf-dynamic-rule|")) | .id' \
  | while read id; do
      curl -X DELETE -H "Authorization: Bearer $CF_API_TOKEN" \
        "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/gateway/rules/$id"
    done
```

## Cleanup-Cron deaktivieren

In `wrangler.toml` `[triggers] crons = []` setzen und `wrangler deploy`.
