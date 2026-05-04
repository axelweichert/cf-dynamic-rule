# Architektur

## Komponentendiagramm

```
+----------------------+
|  Mitarbeiter         |
|  (Browser + WARP)    |
+----------+-----------+
           |
           v
+----------------------+
|  Cloudflare Access   |  <- Azure AD SSO, prueft Identitaet
+----------+-----------+
           |  (JWT in Cf-Access-Jwt-Assertion)
           v
+----------------------+        +-------------------+
|  Worker              | -----> |  KV: TARGETS      |
|  dynamic-access.     |        |  (Whitelist)      |
|  vonbusch.app        |        +-------------------+
|                      |
|  - GET /             |        +-------------------+
|  - GET /api/targets  | -----> |  R2: AUDIT        |
|  - POST /api/request |        |  (JSONL/Tag)      |
|  - GET /api/active   |        +-------------------+
|  - DEL /api/rule/:id |
|                      |        +-------------------+
|  Cron */5 *          | -----> |  Cloudflare       |
|  -> Cleanup          |        |  Gateway API      |
+----------------------+        |  (Network Rules)  |
                                +-------------------+
                                         |
                                         v
                                +-------------------+
                                |  Interne          |
                                |  Ressourcen       |
                                |  (via WARP)       |
                                +-------------------+
```

## Datenfluss: Zugriffsanfrage

1. Mitarbeiter oeffnet `dynamic-access.vonbusch.app` im Browser.
2. Cloudflare Access faengt Request ab, fordert Azure-AD-Login.
3. Nach erfolgreichem Login: Request erreicht Worker mit JWT-Header.
4. Worker verifiziert JWT gegen `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`.
5. Worker liest Email + Gruppen aus JWT-Claims.
6. UI laedt verfuegbare Targets via `GET /api/targets` (gefiltert nach Gruppen).
7. Mitarbeiter waehlt Target + sendet `POST /api/request`.
8. Worker:
   - validiert Auswahl gegen KV-Whitelist,
   - berechnet Expiry (`now + RULE_TTL_MINUTES`),
   - erstellt Gateway-Network-Rule via API mit Filter
     `net.dst.ip == X and net.dst.port == Y` und Identity-Filter
     `identity.email in {user@...}`,
   - taggt Rule via Description: `cf-dynamic-rule|<email>|<expiry-iso>`,
   - schreibt Audit-Eintrag nach R2,
   - antwortet mit Rule-ID und Expiry.

## Datenfluss: Cleanup

- Cron triggert alle 5 Minuten.
- Worker listet Gateway-Rules per `GET /accounts/:id/gateway/rules`.
- Filter: Description beginnt mit `cf-dynamic-rule|`.
- Fuer jede Rule mit `expiry < now`: `DELETE /accounts/:id/gateway/rules/:id`.
- Audit-Eintrag pro Loeschung.

## Sicherheitsmodell

- **Authentifizierung:** Ausschliesslich ueber Cloudflare Access (Azure AD).
  Worker verifiziert JWT - keine Anfrage ohne gueltige Identitaet.
- **Autorisierung:**
  - Worker prueft Target gegen `allowed_groups` im KV-Eintrag vs. JWT-Gruppen.
  - Erstellte Gateway-Rule ist an `identity.email` gebunden -> nur der
    anfragende User kann den Zugriff nutzen.
- **Begrenzung:** Worker akzeptiert nur Targets, die in KV stehen. Freie
  IP/Port-Eingabe ist nicht moeglich.
- **Auditierung:** Jede Anfrage und jeder Cleanup-Lauf wird in R2 protokolliert.
- **Time-to-Live:** Default 20 Min, in `RULE_TTL_MINUTES` konfigurierbar.

## Voraussetzungen im Tenant

| Was | Wie |
|---|---|
| Default-Block-Policy (Private Ranges) | Manuell anlegen, hoechste Prioritaet ueber Allow-Rules |
| WARP enrolled fuer alle Nutzer | Device-Enrollment-Policy mit Azure AD |
| Access-Application fuer Worker-Domain | `dynamic-access.vonbusch.app`, Azure-AD-IdP, Allow-Policy fuer berechtigte Nutzer |
| Azure AD als IdP in Zero Trust | Bereits konfiguriert (Bestand) |
