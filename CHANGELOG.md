# Changelog

Alle nennenswerten Aenderungen an diesem Projekt werden hier dokumentiert.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versionierung: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

## [0.4.2] - 2026-05-04

### Fixed
- **Modal-Bug:** Das "Neues Target"-Modal poppte beim Pageload sofort auf
  und liess sich auch durch Abbrechen-Klick nicht zuverlaessig schliessen.
  Ursache: `.modal-backdrop` setzt `display: flex`, was das HTML-Attribut
  `hidden` ueberschreibt (CSS-Specificity).
  Fix: globale Regel `*[hidden] { display: none !important }` in den
  CSS-Block aufgenommen.

## [0.4.1] - 2026-05-04

### Security
- **IP-Validierung verschaerft.** Targets duerfen jetzt nur noch:
  - **Einzeladressen** sein (kein CIDR mehr) &mdash; ein Target = ein Server
  - in einem **RFC1918-Bereich** liegen (`10.0.0.0/8`, `172.16.0.0/12`,
    `192.168.0.0/16`)
  Public IPs (`8.8.8.8`, `1.1.1.1`), Loopback (`127.0.0.1`), und alle
  Bereiche ausserhalb RFC1918 werden mit `400` abgelehnt.

### Why
- Die Worker-Allow-Rule auf Precedence 1500 ueberschreibt im
  Cloudflare-Gateway alle nachfolgenden L4-Block-Policies. Ein versehentlich
  oder absichtlich angelegtes Target mit `0.0.0.0/0` haette einem User fuer
  20 Minuten freien Zugriff auf das gesamte Internet hinter Gateway gegeben.
  Ein `10.0.0.0/8`-Target haette das gesamte interne /8-Netz freigeschaltet.
  Mit den neuen Limits ist der Wirkbereich pro Allow-Rule maximal eine
  einzelne IP+Port-Kombination innerhalb der internen Netze.

### Changed
- Validator-API in `lib/admin.ts` umstrukturiert:
  - Neue Funktion `validateTargetIp(s)` liefert lesbaren Fehlertext oder
    null. Wird im Admin-Endpoint zur User-Feedback-Anzeige genutzt.
  - Neue Funktion `isValidTargetIp(s)` als Boolean-Wrapper, fuer den
    KV-Runtime-Check in `request.ts`.
  - `isValidIpv4OrCidr` entfernt (war zu permissiv).
- UI: Modal-Form labelt das IP-Feld mit dem expliziten Hinweis
  "(nur RFC1918 Einzeladresse)".
- `docs/api.md`: Dokumentation des `ip`-Feldes aktualisiert.

### Notes
- Migrations-Check der bestehenden Targets durchgefuehrt: alle 3
  (`10.50.10.10`, `10.50.10.20`, `10.50.20.5`) erfuellen die neuen Regeln.
  Kein Backfill noetig.
- 20 Validator-Edge-Cases per Unit-Test verifiziert (RFC1918-Bereiche,
  Boundary-Ranges fuer 172.16/12, public IPs, Loopback, leere Strings,
  ung&uuml;ltige Formate).

## [0.4.0] - 2026-05-04

### Added
- **Admin-Tab** mit Target-Verwaltung (CRUD via UI, kein Cloudflare-Dashboard
  mehr noetig fuer den Tagesbetrieb).
- **Admin-Berechtigung** ueber CSV-Liste `[vars] ADMIN_EMAILS` in
  `wrangler.toml`. Initial: axel.weichert, marius.petrich, mario.hysa.
- **Soft-Delete** fuer Targets: `disabled=true` blendet aus User-Pulldown
  aus, behaelt das Target im Admin-View. Reaktivierung jederzeit moeglich.
- Neue API-Endpoints:
  - `GET /api/me` &mdash; liefert `{email, is_admin}` fuers UI
  - `GET /api/admin/targets` &mdash; alle Targets (auch disabled)
  - `POST /api/admin/targets` &mdash; Target anlegen
  - `PUT /api/admin/targets/:id` &mdash; Target aendern oder reaktivieren
  - `DELETE /api/admin/targets/:id` &mdash; Soft-Delete
- **Audit-Events** `admin_create`, `admin_update`, `admin_delete` in R2.
  Bei Updates wird `details.changes` mit `from`/`to` pro Feld geschrieben.
- **Audit-Felder pro Target**: `created_by`, `created_at`, `updated_by`,
  `updated_at` automatisch befuellt.
- `lib/admin.ts` mit zentralen Validatoren (`isValidIpv4OrCidr`,
  `isValidPort`, `isValidTargetId`) &mdash; werden auch in `request.ts` genutzt.

### Changed
- UI-Layout: Tab-Bar zwischen Header und Content. Tab "Admin" ist nur fuer
  Admins sichtbar (server-side gerendert via `isAdmin()`).
- Admin-Badge im Header neben der Email, wenn der User Admin ist.
- `POST /api/request` gibt jetzt 404 fuer disabled Targets zur&uuml;ck (bevor
  das Target ueberhaupt validiert wird), damit Soft-Deleted Targets nicht
  per ID-Raten reaktivierbar sind.
- `lib/targets.ts`: `listTargets()` filtert disabled raus, neue Funktion
  `listAllTargets()` liefert alles (Admin-only). Neue Helper `putTarget()`,
  `hardDeleteTarget()`.

### Notes
- `ADMIN_EMAILS` ist case-insensitive und ignoriert Whitespace zwischen
  Eintraegen.
- Das Soft-Delete setzt aktive Gateway-Rules NICHT zurueck. Wer einen
  Target sofort sperren will, muss zusaetzlich die laufenden Rules ueber
  das Cloudflare-Dashboard oder per API-Skript beenden.
- User-Verwaltung selbst (wer darf das Tool ueberhaupt benutzen) liegt
  weiterhin bei Cloudflare Access &mdash; nicht im Worker. Externe via
  One-Time-PIN, Interne via Azure AD.

## [0.3.1] - 2026-05-04

### Changed
- **Anzeigename "Dynamic Rule"** statt `cf-dynamic-rule` in der UI:
  - Browser-Title (`<title>`)
  - Header-Wortmarke neben dem Logo
  - Footer-Label

### Notes
- Repo-Name, Worker-Name (`cf-dynamic-rule`), Domain
  (`dynamic-access.vonbusch.app`) und Tag-Prefix in den Gateway-Rule-
  Descriptions (`cf-dynamic-rule|<email>|<expiry>`) bleiben unver&auml;ndert.
  Ein Rename des Tag-Prefix w&uuml;rde existierende aktive Rules vor dem
  Cleanup unsichtbar machen.

## [0.3.0] - 2026-05-04

### Changed
- **UI-Redesign** im Cloudflare-Dashboard-Stil (hell, modern, minimal):
  - Dunkler Header mit von-Busch-Logo (SVG inline) + Wortmarke + User-Email + Logout
  - Erkl&auml;rkarte oben: was passiert beim Anfordern
  - Status-Badges: "Worker live", "KV: N Targets" (oder "leer"), "TTL N min"
  - Pulldown disabled, wenn keine Targets in KV vorhanden
  - Aktive Freigaben in sauberer Tabelle mit lokalisiertem Datum (de-DE)
  - Erfolgsmeldung mit lesbarem "G&uuml;ltig bis" + JSON-Detail
  - Footer mit Domain + Tenant-Hinweis
  - Mobile-Layout (< 600px)
- Logout f&uuml;hrt zu `/cdn-cgi/access/logout` &mdash; loggt komplett aus
  Cloudflare Access aus (alle Apps des Teams).

### Notes
- Logo als Inline-SVG (1879 Byte). Kein externer Asset-Request, kein CDN.
- `</script>`-Konflikte vermieden: ein einziger Closing-Tag im File.
- Kein R2-Probe-Read in der UI (spart eine Class-A-Operation pro Pageload).
  R2-Status implizit &uuml;ber funktionierendes Audit-Logging beim
  `/api/request`-Aufruf erkennbar.

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

[Unreleased]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.4.2...HEAD
[0.4.2]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.2.4...v0.3.0
[0.2.4]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/axelweichert/cf-dynamic-rule/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/axelweichert/cf-dynamic-rule/releases/tag/v0.1.0
