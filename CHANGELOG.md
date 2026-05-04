# Changelog

Alle nennenswerten Aenderungen an diesem Projekt werden hier dokumentiert.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versionierung: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

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

[Unreleased]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/axelweichert/cf-dynamic-rule/releases/tag/v0.1.0
