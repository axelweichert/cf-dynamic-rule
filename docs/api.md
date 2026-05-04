# API

Stand: 0.4.2 (implementiert).

Alle Endpoints liegen hinter Cloudflare Access. Worker erwartet Header
`Cf-Access-Jwt-Assertion` und verifiziert das JWT.

## GET /

Liefert HTML-UI mit Pulldown der erlaubten Targets.

## GET /api/health

Health-Check, kein Auth-Filter durch Worker (Access regelt).

```json
{
  "status": "ok",
  "version": "0.4.2",
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
- `404` Target unbekannt (nicht in KV-Whitelist) oder Soft-Deleted
- `409` Active Rule fuer dasselbe Target+User existiert bereits
- `500` KV-Eintrag invalide (`ip` nicht in RFC1918 oder kein Einzelhost,
  `port` nicht 1..65535) oder Gateway-API-Fehler (Details in R2-Audit)

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

---

## GET /api/me

Liefert die JWT-Email und das Admin-Flag. Vom UI verwendet, um den Admin-Tab
ein-/auszublenden.

```json
{
  "email": "axel.weichert@vonbusch.digital",
  "is_admin": true
}
```

---

## Admin-Endpoints

Alle `/api/admin/*`-Endpoints pruefen die JWT-Email gegen die CSV-Liste in
`env.ADMIN_EMAILS`. User, die nicht in der Liste stehen, erhalten `403`.

### GET /api/admin/targets

Liefert ALLE Targets, auch disabled (Soft-Deleted). Sortiert: aktive zuerst,
dann nach Label.

```json
{
  "targets": [
    {
      "id": "srv-rdp-fileserver01",
      "label": "Fileserver 01 (RDP)",
      "ip": "10.50.10.20",
      "port": 3389,
      "protocol": "tcp",
      "service": "RDP",
      "disabled": false,
      "created_by": "axel.weichert@vonbusch.digital",
      "created_at": "2026-05-04T19:00:00.000Z",
      "updated_by": "axel.weichert@vonbusch.digital",
      "updated_at": "2026-05-04T19:00:00.000Z"
    }
  ]
}
```

### POST /api/admin/targets

Neues Target anlegen.

Request:
```json
{
  "id": "srv-ssh-newserver",
  "label": "Neuer Server (SSH)",
  "ip": "10.50.10.99",
  "port": 22,
  "protocol": "tcp",
  "service": "SSH"
}
```

Validierung:
- `id`: `[a-z0-9-]{1,64}`
- `label`: 1..100 Zeichen
- `ip`: IPv4-Einzeladresse (kein CIDR) in einem RFC1918-Bereich
  (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
- `port`: Integer 1..65535
- `protocol`: `"tcp"` oder `"udp"`
- `service`: 1..50 Zeichen

Fehler:
- `400` Validierung fehlgeschlagen
- `401` Kein/ungueltiges JWT
- `403` Nicht in `ADMIN_EMAILS`
- `409` Target mit dieser ID existiert bereits

### PUT /api/admin/targets/:id

Aendert ein bestehendes Target. Erlaubte Felder: `label`, `ip`, `port`,
`protocol`, `service`, `disabled`. `id` ist immutable.

Wird verwendet sowohl fuer Edits als auch zum Reaktivieren eines disabled
Targets (`{"disabled": false}`).

Fehler:
- `400` Validierung fehlgeschlagen
- `401` / `403` wie oben
- `404` Target unbekannt

### DELETE /api/admin/targets/:id

Soft-Delete. Setzt `disabled=true`. Bestehende Gateway-Rules bleiben
unberuehrt &mdash; sie laufen ueber TTL ab oder werden vom User per
`/api/rule/:id` beendet. Hard-Delete ist nicht ueber das UI verfuegbar.

Fehler:
- `401` / `403` wie oben
- `404` Target unbekannt
- `409` Target ist bereits disabled
