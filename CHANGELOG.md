# Changelog

Alle nennenswerten Aenderungen an diesem Projekt werden hier dokumentiert.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versionierung: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

## [0.2.4] - 2026-05-04

### Fixed
- **Gateway-Filter-Syntax-Bug:** `POST /api/request` lieferte 500 mit
  "Filter parsing error: expected IP address character". Ursache: IP wurde
  als String-Literal in den Filter eingebaut (`net.dst.ip == "10.50.20.5"`),
  Gateway-Parser akzeptiert dort aber nur IP-Literale ohne Quotes. Fix:
  `net.dst.ip in {10.50.20.5} and net.dst.port == 443` (IP ohne Quotes,
  via `in {...}`-Notation gemaess Cloudflare-Doku).

### Added
- Defensive Validierung des KV-Eintrags vor dem Gateway-Call:
  - `ip` muss IPv4 oder IPv4-CIDR sein
  - `port` muss Integer in 1..65535 sein
  Bei Verstoss: `500` mit klarer Fehlermeldung statt schwammigem
  Gateway-Parser-Error.

### Notes
- IPv6-Targets werden weiter nicht unterstuetzt (kein Use Case in der
  aktuellen Demo). Falls noetig, Validierung und Filter-Bau erweitern.

## [0.2.3] - 2026-05-04

### Fixed
- `wrangler.toml`: KV-Namespace-ID `REPLACE_WITH_KV_ID` durch echte ID
  `a9828e41f148408b91a97fd42d7d58a6` ersetzt. Workers Builds schlugen seit 0.2.0
  mit "KV namespace not found" fehl. Letzter erfolgreicher Build davor war
  `967a45c` (0.1.1, der Stub mit auskommentiertem KV-Eintrag).

### Notes
- KV-Namespace `cf-dynamic-rule-targets` wurde im Account "von Busch GmbH -
  Kunden Demoumgebung NFR" angelegt.
- KV-Inhalt (Targets) ist noch nicht geseedet. Das Portal wird bis zum Seed
  ein leeres Pulldown anzeigen. Seeding via Cloudflare-Dashboard:
  Worker -> Storage & Databases -> KV -> cf-dynamic-rule-targets -> Add.
  Drei Keys aus `targets/seed.json` einfuegen (Key-Schema: `targets:<id>`).
- Secrets `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `ACCESS_AUD` muessen im Worker-
  Dashboard noch gesetzt werden, sonst liefert `/api/request` 500.
- Cloudflare Access Application fuer `dynamic-access.vonbusch.app` muss im
  Zero-Trust-Dashboard noch angelegt werden, sonst gibt es nur 401 vom Worker
  (kein JWT).

## [0.2.2] - 2026-05-04

### Fixed
- Versions-Konsistenz: `src/index.ts` (Header + `/api/health`-Response),
  `package-lock.json`, `README.md`-Status-Zeile und `docs/api.md` waren in 0.2.1
  noch auf 0.2.0 stehengeblieben. Alle Stellen jetzt auf der aktuellen Version.

### Added
- `.gitignore` (node_modules, dist, .wrangler, .env, Logs)

### Docs
- `docs/api.md`: Status-Hinweis "Spezifikation" entfernt (Endpoints sind seit
  0.2.0 implementiert), Health-Beispiel-Version aktualisiert, Feldname
  `timestamp` -> `ts` (passt zur tatsaechlichen Response).
- `docs/api.md`: Falsche `403`-Fehlerbeschreibung bei `POST /api/request`
  entfernt (Gruppen-Autorisierung ist in 0.2.x nicht aktiv, Option A).
- `docs/api.md`: `GET /api/targets`-Beschreibung korrigiert (kein Gruppen-Filter).

## [0.2.1] - 2026-05-04

### Fixed
- Skripte rufen `npx wrangler` statt `wrangler` auf (kein globaler Wrangler noetig)
- Skripte pruefen Existenz von `node_modules` und brechen mit klarer Meldung ab

## [0.2.0] - 2026-05-04

### Added
- JWT-Verifikation gegen Cloudflare Access (RS256, JWKS-Cache, aud/iss/exp-Pruefung)
- Cloudflare Gateway API Client (POST/GET/DELETE Rules)
- KV-basierte Target-Whitelist (`targets:<id>`)
- R2 Audit-Log (JSONL pro Tag, append via Read-Modify-Write)
- HTML-UI mit Pulldown, aktiven Freigaben, Revoke-Button
- POST /api/request: erstellt Allow-Rule (TTL 20 Min, identity.email gebunden)
- GET /api/active: zeigt aktive Rules des angemeldeten Users
- DELETE /api/rule/:id: vorzeitiges Beenden eigener Rules
- Cron-Cleanup */5 Min: loescht abgelaufene Managed-Rules
- Konflikt-Erkennung: 409, wenn aktive Rule fuer dasselbe Target+User existiert

### Notes
- Option A: keine Gruppen-Filterung. Jeder durch Access authentifizierte User
  darf alle Targets sehen und anfordern.
- Rule-Description-Konvention: `cf-dynamic-rule|<email>|<expiry-iso>`
- Rule-Name-Konvention: `cf-dynamic-rule-<target_id>-<email>`
- Vor Deploy: KV-Namespace + R2-Bucket anlegen, ID in wrangler.toml eintragen.

## [0.1.1] - 2026-05-04

### Fixed
- Workers Builds Deploy-Fehler "Could not detect a directory containing static files":
  - Wrangler-Version auf ^4.87.0 angehoben (Workers Builds nutzt v4)
  - Ungueltige KV-Namespace-ID (`REPLACE_WITH_KV_ID`) auskommentiert, KV/R2/Cron-Bindings
    erst nach Anlage der Ressourcen aktivieren
  - `compatibility_date` auf bestaetigten Stand 2025-04-01 gesetzt
  - `src/index.ts` als minimaler, deploybarer Stub mit /api/health und HTML-Stub auf /
- ACCESS_TEAM_DOMAIN auf `vonbuschthree60.cloudflareaccess.com` gesetzt

### Notes
- Falls Build im Dashboard weiter fehlschlaegt: pruefen ob das Worker-Projekt
  im Dashboard angelegt ist und der Repository-Root-Pfad auf "/" zeigt
  (Settings > Build > Build Configuration).

## [0.1.0] - 2026-05-04

### Added
- Initiales Repo-Bootstrap
- README mit Architektur- und Setup-Beschreibung
- Verzeichnisstruktur (src/, targets/, scripts/, docs/)
- wrangler.toml als Konfig-Skelett
- package.json + tsconfig.json
- VERSION-Datei
- .gitignore

### Notes
- Noch keine funktionale Implementierung
- Cloudflare-Account, KV, R2, Access-App noch nicht provisioniert

[Unreleased]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.2.4...HEAD
[0.2.4]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/axelweichert/cf-dynamic-rule/releases/tag/v0.1.0
