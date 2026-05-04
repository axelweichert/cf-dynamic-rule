# Changelog

Alle nennenswerten Aenderungen an diesem Projekt werden hier dokumentiert.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versionierung: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

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

[Unreleased]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/axelweichert/cf-dynamic-rule/releases/tag/v0.1.0
