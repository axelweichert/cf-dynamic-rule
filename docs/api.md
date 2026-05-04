# API

Status: Spezifikation, Implementierung folgt ab 0.2.0.

Alle Endpoints liegen hinter Cloudflare Access. Worker erwartet Header
`Cf-Access-Jwt-Assertion` und verifiziert das JWT.

## GET /

Liefert HTML-UI mit Pulldown der erlaubten Targets.

## GET /api/health

Health-Check, kein Auth-Filter durch Worker (Access regelt).

```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2026-05-04T13:00:00.000Z"
}
```

## GET /api/targets

Liefert Targets, die der Nutzer waehlen darf (gefiltert nach JWT-Gruppen).

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
- `401` Kein/ungueltiges JWT
- `403` Target nicht in erlaubten Gruppen des Users
- `404` Target unbekannt
- `409` Active Rule fuer dasselbe Target existiert bereits
- `500` Gateway-API-Fehler (Details in R2-Audit)

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
