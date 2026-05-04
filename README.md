# cf-dynamic-rule

Self-Service-Portal für temporären Zero-Trust-Zugriff auf interne Ressourcen.
Läuft als Cloudflare Worker, erstellt zeitlich begrenzte Gateway-Network-Allow-Policies
für authentifizierte Nutzer (Azure AD via Cloudflare Access).

**Status:** 0.2.4 (deploy-ready, KV gebunden)
**Tenant:** Busch GmbH NFR Demo
**Domain:** dynamic-access.vonbusch.app

---

## Use Case

Interne und externe Mitarbeiter benötigen kurzfristig Zugriff auf interne Ressourcen
(Server, Dienste). Klassisches Vorgehen: Ticket -> Admin legt Firewall-Regel an ->
manuelles Aufräumen. cf-dynamic-rule automatisiert das:

1. Mitarbeiter öffnet `dynamic-access.vonbusch.app`
2. Login per Azure AD (über Cloudflare Access)
3. Wählt aus Pulldown: Ziel-Server + Dienst (IP + Port aus Whitelist)
4. Klick auf "Zugriff anfordern"
5. Worker erstellt Gateway-Allow-Rule, gebunden an die Email des Nutzers
6. Zugriff per WARP-Client moeglich, **20 Minuten** lang
7. Cron-Job loescht abgelaufene Regeln

## Architektur

```
+----------+     +----------------+     +-----------+     +---------------+
| Mitarb.  | --> | CF Access      | --> | Worker    | --> | Gateway API   |
| (WARP)   |     | (Azure AD SSO) |     | (UI+API)  |     | (Rule create) |
+----------+     +----------------+     +-----------+     +---------------+
                                              |
                                              +--> KV (Target-Whitelist)
                                              +--> R2 (Audit-Log)
                                              +--> Cron Trigger (Cleanup)
```

### Komponenten

| Komponente | Zweck |
|---|---|
| Cloudflare Worker | Web-UI + REST-API |
| Cloudflare Access | SSO-Gate vor dem Worker, liefert verifizierte Email im JWT |
| Workers KV | Whitelist erlaubter Targets (IP, Port, Service) |
| R2 Bucket | Audit-Log (JSONL pro Tag) |
| Cron Trigger | Cleanup abgelaufener Gateway-Rules (alle 5 min) |
| Gateway Network Policies | Tatsaechliche Zugriffskontrolle auf L4 |

### Default-Setup im Tenant (Voraussetzung, manuell)

- Default-Block-Policy auf Private Ranges (10/8, 172.16/12, 192.168/16)
- Cloudflare Access Application fuer `dynamic-access.vonbusch.app` mit Azure AD IdP
- WARP-Client auf Endgeraeten enrolled, Identity-Login aktiv

---

## Setup

### Voraussetzungen

- Node.js 20+
- `wrangler` CLI (`npm i -g wrangler` oder als devDep nutzen)
- Cloudflare API-Token mit Permissions:
  - `Account:Zero Trust:Edit`
  - `Account:Account Settings:Read`
  - `Account:Workers Scripts:Edit`
  - `Account:Workers KV Storage:Edit`
  - `Account:Workers R2 Storage:Edit`

### Installation

```bash
git clone https://github.com/axelweichert/cf-dynamic-rule.git
cd cf-dynamic-rule
npm install
```

### Konfiguration

1. `wrangler.toml` anpassen (Account-ID, Domain, KV-/R2-IDs)
2. Secrets setzen:
   ```bash
   wrangler secret put CF_API_TOKEN
   wrangler secret put CF_ACCOUNT_ID
   wrangler secret put ACCESS_AUD
   ```
3. KV-Namespace und R2-Bucket erstellen (siehe `scripts/`)
4. Targets seeden:
   ```bash
   ./scripts/seed-kv.sh
   ```

### Deploy

```bash
wrangler deploy
```

---

## API

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/` | UI mit Pulldown |
| GET | `/api/targets` | Liste verfuegbarer Targets (gefiltert nach User-Gruppen) |
| POST | `/api/request` | Neue Allow-Rule erstellen |
| GET | `/api/active` | Aktive Rules des aktuellen Users |
| DELETE | `/api/rule/:id` | Rule vorzeitig beenden |

Details: siehe `docs/api.md`

---

## Betrieb

- Audit-Log: R2-Bucket `cf-dynamic-rule-audit`, ein Objekt pro Tag (`YYYY-MM-DD.jsonl`)
- Logs: `wrangler tail`
- Cleanup-Status: GET `/api/health` zeigt letzten Cron-Run und Anzahl gelöschter Rules
- Runbook: `docs/runbook.md`

---

## Versionierung

SemVer. Aktuelle Version: siehe `VERSION`. Aenderungen: siehe `CHANGELOG.md`.

## Lizenz

Proprietaer / intern (Weichert).
