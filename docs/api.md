# API

Stand: 0.2.2 (implementiert).

Alle Endpoints liegen hinter Cloudflare Access. Worker erwartet Header
`Cf-Access-Jwt-Assertion` und verifiziert das JWT.

## GET /

Liefert HTML-UI mit Pulldown der erlaubten Targets.

## GET /api/health

Health-Check, kein Auth-Filter durch Worker (Access regelt).

```json
{
  "status": "ok",
  "version": "0.2.2",
  "ts": "2026-05-04T13:00:00.000Z"
}
```

## GET /api/targets

Liefert alle Targets aus der KV-Whitelist. In 0.2.x ohne Gruppen-Filter
(jeder Access-authentifizierte Nutzer sieht alle Targets).

```json
{
  "targets": [
    {
      "id": "srv-rdp-fileserver01",
      "label": "Fileserver 01 (RDP)",
      "service": "RDP",
      "ip": "10.50.10.20",
      "port": 3389
    }
  ]
}
```

## POST /api/request

Erstellt temporaere Gateway-Allow-Rule.

Request:
```json
{ "target_id": "srv-rdp-fileserver01" }
```

Response:
```json
{
  "rule_id": "abc123...",
  "target_id": "srv-rdp-fileserver01",
  "granted_to": "user@example.com",
  "valid_until": "2026-05-04T13:20:00.000Z",
  "ttl_minutes": 20
}
```

Fehler:
- `400` Body ohne `target_id`
- `401` Kein/ungueltiges JWT
- `404` Target unbekannt (nicht in KV-Whitelist)
- `409` Active Rule fuer dasselbe Target+User existiert bereits
- `500` Gateway-API-Fehler (Details in R2-Audit)

Hinweis: Gruppen-basierte Autorisierung (`allowed_groups` aus dem KV-Eintrag)
ist in 0.2.x nicht aktiv. Jeder durch Cloudflare Access authentifizierte
Nutzer darf alle Targets anfordern.

## GET /api/active

Aktive Rules des aktuellen Users.

```json
{
  "active": [
    {
      "rule_id": "abc123",
      "target_id": "srv-rdp-fileserver01",
      "valid_until": "2026-05-04T13:20:00.000Z"
    }
  ]
}
```

## DELETE /api/rule/:id

Beendet eine Rule vorzeitig. Nur eigene Rules sind loeschbar
(geprueft via Tag-Email vs. JWT-Email).
