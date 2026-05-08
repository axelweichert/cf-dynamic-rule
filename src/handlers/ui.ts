// HTML-UI Handler. Minimal, ohne Build-Pipeline.
// 0.4.0: Tab-Bar mit Admin-Tab (nur fuer Admins), Admin-CRUD fuer Targets.

import type { Env, Target } from "../types.js";
import { requireUser } from "../lib/jwt.js";
import { isAdmin } from "../lib/admin.js";
import { listTargets } from "../lib/targets.js";

const VON_BUSCH_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 546.42 118.1" aria-label="von Busch"><path fill="#fff" d="M513.89,50V163.78h10.49V133c0-11.59.91-25.67,15.33-25.67,12.19,0,13,9.39,13,19.87v36.56h10.48V125.29c0-15.18-3.93-28.15-21-28.15-7.6,0-13.24,3.45-17.56,9.66l-.26-.27V50Zm-20.58,53.67a32.06,32.06,0,0,0-19-6.49c-18.09,0-32.9,14.91-32.9,34.22,0,19.59,14.15,34.22,32.77,34.22,7.34,0,13.5-2.35,19.53-6.63V144.19h-.27c-5.11,7-11.27,11.18-20.05,11.18-12.84,0-21.23-11.18-21.23-24s9-24,21.76-24c8.25,0,14.28,4.42,19.13,10.9h.26ZM425,109.15c-2.75-6.76-9.31-12-16.39-12a18,18,0,0,0-18.35,18.36c0,20.41,27.79,15.45,27.79,29.93a9.6,9.6,0,0,1-10,9.94c-6.95,0-10-4.28-12.58-10.35l-9.31,4.14c3.28,10.21,11.4,16.42,21.76,16.42a20.66,20.66,0,0,0,20.84-21.11c0-10.9-7.08-15.46-14.29-18.63s-14.28-5.38-14.28-11.31c0-4.14,3.93-7.18,7.6-7.18s6.94,3.18,8.39,6.63ZM330,98.94H319.52v37.39c0,17.24,6.16,29.25,24.38,29.25s24.38-12,24.38-29.25V98.94H357.79v36.14c0,10.9-1.18,20.29-13.89,20.29S330,146,330,135.08ZM252.94,70.52h4.32c13.5,0,22.94,1.65,22.94,17.38,0,16.14-10.62,17.66-23.07,17.66h-4.19Zm-11,93.26h22.93c19.53,0,35.39-8.28,35.39-29,0-12.42-6.94-23.59-18.74-26.63,6.68-4.69,9.7-11.86,9.7-20.28,0-21.25-15.07-28.14-33-28.14H241.93Zm11-48.28h9.57c12.05,0,26.73,2.34,26.73,18.48,0,15.87-13,19-25.29,19h-11ZM179.28,98.94H168.79v64.84h10.49V133c0-11.59.92-25.67,15.33-25.67,12.19,0,13,9.39,13,19.87v36.56h10.48V125.29c0-15.18-3.93-28.15-21-28.15-7.6,0-13.24,3.45-17.56,9.66h-.26Zm-61.21,8.41c13,0,21.89,10.9,21.89,24s-8.91,24-21.89,24-21.89-10.77-21.89-24,8.91-24,21.89-24m0,58.23c18,0,32.37-15,32.37-34.08s-14.28-34.36-32.37-34.36S85.7,112.46,85.7,131.5s14.41,34.08,32.37,34.08M28.68,98.94H16.75L47,168.06,77.18,98.94H65.38L47,142.54Z" transform="translate(-16.75 -49.96)"/></svg>`;

const CSS = `
  * { box-sizing: border-box; }
  *[hidden] { display: none !important; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #111827;
    background: #f6f7f9;
    font-size: 14px;
    line-height: 1.5;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  header {
    background: #0a0a0a;
    color: #fff;
    padding: 0 24px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #1f1f1f;
  }
  header .brand { display: flex; align-items: center; gap: 16px; }
  header .brand svg { height: 26px; width: auto; display: block; }
  header .brand .sep { width: 1px; height: 22px; background: #2a2a2a; }
  header .brand .app-name { font-size: 13px; font-weight: 500; letter-spacing: 0.02em; color: #d1d5db; }
  header .user { display: flex; align-items: center; gap: 12px; font-size: 13px; }
  header .user .email { color: #d1d5db; }
  header .user .admin-badge {
    font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 3px;
    background: #1e3a8a; color: #93c5fd; letter-spacing: 0.05em;
  }
  header .user a {
    color: #9ca3af; text-decoration: none; padding: 6px 10px; border-radius: 4px;
    border: 1px solid #2a2a2a; transition: all 0.15s;
  }
  header .user a:hover { color: #fff; border-color: #3a3a3a; background: #151515; }

  .tabbar {
    background: #fff; border-bottom: 1px solid #e5e7eb;
    padding: 0 24px;
  }
  .tabbar-inner {
    max-width: 1280px; margin: 0 auto; display: flex; gap: 4px;
  }
  .tab {
    background: transparent; border: 0; padding: 12px 16px;
    font-family: inherit; font-size: 13px; font-weight: 500;
    color: #6b7280; cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }
  .tab:hover { color: #111827; }
  .tab.active { color: #0051c3; border-bottom-color: #0051c3; }
  .tab.hidden { display: none; }

  main {
    flex: 1;
    max-width: 1280px;
    width: 100%;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }
  h1.page { font-size: 22px; font-weight: 600; margin: 0 0 6px; color: #111827; }
  p.lede { color: #4b5563; margin: 0 0 24px; }

  .panel { display: none; }
  .panel.active { display: block; }

  .status-row {
    display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px;
  }
  .badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 999px;
    font-size: 12px; font-weight: 500;
    border: 1px solid transparent;
  }
  .badge .dot { width: 6px; height: 6px; border-radius: 50%; }
  .badge.ok { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
  .badge.ok .dot { background: #10b981; }
  .badge.warn { background: #fffbeb; color: #92400e; border-color: #fde68a; }
  .badge.warn .dot { background: #f59e0b; }
  .badge.info { background: #eff6ff; color: #1e40af; border-color: #bfdbfe; }
  .badge.info .dot { background: #3b82f6; }
  .badge.muted { background: #f3f4f6; color: #6b7280; border-color: #e5e7eb; }
  .badge.muted .dot { background: #9ca3af; }

  .card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 20px 24px;
    margin-bottom: 16px;
  }
  .card h2 {
    font-size: 14px; font-weight: 600; margin: 0 0 16px; color: #111827;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .card .card-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px;
  }
  .card .card-header h2 { margin: 0; }
  .card.intro { background: #fafbfc; }
  .card.intro p { margin: 0; color: #4b5563; font-size: 13px; }
  .card.intro p + p { margin-top: 8px; }

  label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #374151; }
  .field { margin-bottom: 12px; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  input[type=text], input[type=number], select {
    width: 100%; font-family: inherit; font-size: 14px;
    padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;
    background: #fff; color: #111827;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  input:focus, select:focus { outline: none; border-color: #0051c3; box-shadow: 0 0 0 3px rgba(0,81,195,0.12); }
  input.error { border-color: #dc2626; }

  button {
    font-family: inherit; font-size: 14px; font-weight: 500;
    padding: 8px 16px; border-radius: 6px; cursor: pointer;
    transition: all 0.15s;
    border: 1px solid transparent;
  }
  button.primary { background: #0051c3; color: #fff; }
  button.primary:hover:not(:disabled) { background: #003e96; }
  button.primary:disabled { background: #9ca3af; cursor: not-allowed; }
  button.outline {
    background: #fff; color: #374151; border-color: #d1d5db;
    padding: 4px 10px; font-size: 12px;
  }
  button.outline:hover { background: #f9fafb; border-color: #9ca3af; }
  button.outline.danger { color: #b91c1c; border-color: #fecaca; }
  button.outline.danger:hover { background: #fef2f2; border-color: #f87171; }
  button.ghost {
    background: transparent; color: #6b7280; border-color: transparent;
    padding: 4px 8px; font-size: 12px;
  }
  button.ghost:hover { background: #f3f4f6; color: #111827; }

  .actions { margin-top: 16px; display: flex; gap: 8px; }

  .out { margin-top: 16px; padding: 12px 16px; border-radius: 6px; font-size: 13px; }
  .out.ok { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
  .out.err { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
  .out pre { margin: 0; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; white-space: pre-wrap; word-break: break-all; }
  .out .summary { font-weight: 500; margin-bottom: 6px; }

  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
  th { font-weight: 500; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; background: #fafbfc; }
  td.target { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; color: #374151; }
  td.expiry { color: #6b7280; font-variant-numeric: tabular-nums; }
  td.action { width: 180px; text-align: right; white-space: nowrap; }
  td.action button + button { margin-left: 6px; }
  td.target-id { font-family: ui-monospace, monospace; font-size: 12px; color: #6b7280; }
  td.disabled-row { opacity: 0.55; }
  .empty { color: #6b7280; font-size: 13px; text-align: center; padding: 24px; font-style: italic; }

  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(17,24,39,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 100; padding: 20px;
  }
  .modal {
    background: #fff; border-radius: 8px; padding: 24px;
    width: 100%; max-width: 480px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.25);
  }
  .modal h3 { margin: 0 0 16px; font-size: 16px; font-weight: 600; }
  .modal .actions { margin-top: 20px; justify-content: flex-end; }
  .modal .err-line { color: #b91c1c; font-size: 12px; margin-top: 8px; min-height: 18px; }

  footer {
    text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;
    border-top: 1px solid #e5e7eb; background: #fff;
  }
  footer code { font-family: ui-monospace, "SF Mono", Menlo, monospace; color: #6b7280; }

  @media (max-width: 600px) {
    header { padding: 0 16px; }
    header .brand .app-name { display: none; }
    main { padding: 24px 16px 48px; }
    .card { padding: 16px; }
    .field-row { grid-template-columns: 1fr; }
    td.action { width: auto; }
  }
`;

export async function handleUi(request: Request, env: Env): Promise<Response> {
  let user: { email: string };
  try {
    user = await requireUser(request, env);
  } catch (err) {
    return new Response(`Unauthorized: ${(err as Error).message}`, { status: 401 });
  }

  const targets = await listTargets(env);
  const ttl = env.RULE_TTL_MINUTES;
  const admin = isAdmin(user.email, env);
  const html = renderHtml(user.email, targets, ttl, admin);

  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function renderHtml(email: string, targets: Target[], ttl: string, admin: boolean): string {
  const options = targets
    .map(
      (t) =>
        `<option value="${escapeHtml(t.id)}">${escapeHtml(t.label)} &mdash; ${escapeHtml(t.ip)}:${t.port}/${escapeHtml(t.protocol)}</option>`,
    )
    .join("");

  const kvBadge =
    targets.length > 0
      ? `<span class="badge ok"><span class="dot"></span>KV: ${targets.length} Targets</span>`
      : `<span class="badge warn"><span class="dot"></span>KV: leer</span>`;

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Dynamic Rule &mdash; Self-Service Zero Trust</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>${CSS}</style>
</head>
<body>
  <header>
    <div class="brand">
      ${VON_BUSCH_LOGO_SVG}
      <span class="sep"></span>
      <span class="app-name">Dynamic Rule</span>
    </div>
    <div class="user">
      ${admin ? `<span class="admin-badge">ADMIN</span>` : ""}
      <span class="email">${escapeHtml(email)}</span>
      <a href="/cdn-cgi/access/logout" title="Aus Cloudflare Access ausloggen (alle Apps)">Logout</a>
    </div>
  </header>

  <nav class="tabbar">
    <div class="tabbar-inner">
      <button class="tab active" data-tab="access">Zugriff anfordern</button>
      <button class="tab ${admin ? "" : "hidden"}" data-tab="admin">Admin &mdash; Targets</button>
      <button class="tab ${admin ? "" : "hidden"}" data-tab="admin-users">Admin &mdash; User</button>
      <button class="tab ${admin ? "" : "hidden"}" data-tab="admin-packages">Admin &mdash; Pakete</button>
    </div>
  </nav>

  <main>
    <!-- Tab: Zugriff anfordern -->
    <section class="panel active" data-panel="access">
      <h1 class="page">Tempor&auml;rer Zugriff auf interne Ressourcen</h1>
      <p class="lede">W&auml;hle ein Ziel und fordere zeitlich begrenzten Zugriff an. Der Zugriff l&auml;uft nach <strong>${escapeHtml(ttl)} Minuten</strong> automatisch ab.</p>

      <div class="status-row">
        <span class="badge ok"><span class="dot"></span>Worker live</span>
        ${kvBadge}
        <span class="badge info"><span class="dot"></span>TTL ${escapeHtml(ttl)} min</span>
      </div>

      <div class="card intro">
        <p><strong>Was passiert hier?</strong> Mit einem Klick auf &bdquo;Zugriff anfordern&ldquo; wird automatisch eine Cloudflare-Gateway-Allow-Regel erstellt, die ausschliesslich auf deine Identit&auml;t (<code>${escapeHtml(email)}</code>) und das gew&auml;hlte Ziel beschr&auml;nkt ist.</p>
        <p>Der Zugriff erfolgt anschliessend &uuml;ber den WARP-Client und endet automatisch nach Ablauf der TTL. Du kannst eigene Freigaben jederzeit vorzeitig beenden.</p>
      </div>

      <div class="card">
        <h2>Meine Zugriffspakete</h2>
        <p class="lede" style="margin: 0 0 12px 0;">Ein Admin hat dir diese Zugriffsfenster vorbereitet. Klick auf &bdquo;Zugriff anfordern&ldquo;, um die Allow-Regel zu erstellen.</p>
        <div id="my-packages"><div class="empty">l&auml;dt &hellip;</div></div>
        <div id="out" hidden></div>
      </div>

      ${admin ? `<div class="card">
        <h2>Sandbox-Auswahl <span class="admin-badge">ADMIN</span></h2>
        <p class="lede" style="margin: 0 0 12px 0;">Direkter Self-Service-Pfad ohne Paket. Nur f&uuml;r Admins, f&uuml;r Tests und Notf&auml;lle.</p>
        <label for="target">Ziel ausw&auml;hlen</label>
        <select id="target" ${targets.length === 0 ? "disabled" : ""}>
          ${targets.length === 0 ? `<option value="">(Keine Targets verf&uuml;gbar)</option>` : `<option value="">&mdash; bitte w&auml;hlen &mdash;</option>`}
          ${options}
        </select>
        <div class="actions">
          <button id="go" class="primary" ${targets.length === 0 ? "disabled" : ""}>Zugriff anfordern</button>
        </div>
      </div>` : ""}

      <div class="card">
        <h2>Aktive Freigaben</h2>
        <div id="active"><div class="empty">l&auml;dt &hellip;</div></div>
      </div>
    </section>

    <!-- Tab: Admin (nur fuer Admins) -->
    <section class="panel" data-panel="admin">
      <h1 class="page">Target-Verwaltung</h1>
      <p class="lede">Targets sind die internen Ressourcen, die User &uuml;ber das Self-Service-Portal anfordern k&ouml;nnen. &Auml;nderungen sind sofort aktiv.</p>

      <div class="card">
        <div class="card-header">
          <h2>Targets</h2>
          <button id="admin-add" class="primary">+ Neues Target</button>
        </div>
        <div id="admin-list"><div class="empty">l&auml;dt &hellip;</div></div>
      </div>

      <div class="card intro">
        <p><strong>Hinweis:</strong> &bdquo;Beenden&ldquo; ist ein Soft-Delete &mdash; das Target wird auf inaktiv gesetzt und verschwindet aus dem User-Pulldown. Bestehende aktive Freigaben laufen wie geplant ab oder k&ouml;nnen vom User vorzeitig beendet werden.</p>
        <p>Ein deaktiviertes Target kann jederzeit wieder aktiviert werden. Eine harte L&ouml;schung erfolgt nicht &uuml;ber dieses UI &mdash; siehe Runbook.</p>
      </div>
    </section>

    <!-- Tab: Admin -- User-Verwaltung (v0.5.0) -->
    <section class="panel" data-panel="admin-users">
      <h1 class="page">User-Verwaltung</h1>
      <p class="lede">Bekannte User, f&uuml;r die Zugriffspakete angelegt werden k&ouml;nnen. User identifizieren sich beim Login &uuml;ber ihre E-Mail-Adresse (Cloudflare Access).</p>

      <div class="card">
        <div class="card-header">
          <h2>User</h2>
          <button id="users-add" class="primary">+ Neuer User</button>
        </div>
        <div id="users-list"><div class="empty">l&auml;dt &hellip;</div></div>
      </div>
    </section>

    <!-- Tab: Admin -- Paket-Verwaltung (v0.5.0) -->
    <section class="panel" data-panel="admin-packages">
      <h1 class="page">Zugriffspakete</h1>
      <p class="lede">Vorbestellte Zugriffsfenster f&uuml;r einen User auf ein konkretes Ziel. <strong>Vier-Augen-Prinzip:</strong> ein Paket ist erst aktiv, wenn ein <em>anderer</em> Admin als der Ersteller es freischaltet.</p>

      <div class="card">
        <div class="card-header">
          <h2>Pakete</h2>
          <button id="packages-add" class="primary">+ Neues Paket</button>
        </div>
        <div id="packages-list"><div class="empty">l&auml;dt &hellip;</div></div>
      </div>
    </section>

    <!-- Modal fuer Add/Edit (admin -- targets) -->
    <div id="modal" class="modal-backdrop" hidden>
      <div class="modal">
        <h3 id="modal-title">Neues Target</h3>
        <div class="field">
          <label for="m-id">ID</label>
          <input type="text" id="m-id" placeholder="z.B. srv-rdp-buchhaltung" autocomplete="off">
        </div>
        <div class="field">
          <label for="m-label">Anzeigename</label>
          <input type="text" id="m-label" placeholder="z.B. Buchhaltung Terminalserver" autocomplete="off">
        </div>
        <div class="field-row">
          <div class="field">
            <label for="m-ip">IP <span style="color:#9ca3af; font-weight: 400;">(nur RFC1918 Einzeladresse)</span></label>
            <input type="text" id="m-ip" placeholder="10.50.10.20" autocomplete="off">
          </div>
          <div class="field">
            <label for="m-port">Port</label>
            <input type="number" id="m-port" min="1" max="65535" placeholder="3389">
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="m-protocol">Protokoll</label>
            <select id="m-protocol">
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
            </select>
          </div>
          <div class="field">
            <label for="m-service">Dienst</label>
            <input type="text" id="m-service" placeholder="z.B. RDP" autocomplete="off">
          </div>
        </div>
        <div id="m-err" class="err-line"></div>
        <div class="actions">
          <button id="m-cancel" class="ghost">Abbrechen</button>
          <button id="m-save" class="primary">Speichern</button>
        </div>
      </div>
    </div>

    <!-- Modal fuer User-Add -->
    <div id="user-modal" class="modal-backdrop" hidden>
      <div class="modal">
        <h3 id="user-modal-title">Neuer User</h3>
        <div class="field">
          <label for="u-email">E-Mail</label>
          <input type="email" id="u-email" placeholder="vorname.nachname@example.com" autocomplete="off">
        </div>
        <div class="field">
          <label for="u-label">Anzeigename <span style="color:#9ca3af; font-weight: 400;">(optional)</span></label>
          <input type="text" id="u-label" placeholder="z.B. Max Mustermann (Externer Berater)" autocomplete="off">
        </div>
        <div id="u-err" class="err-line"></div>
        <div class="actions">
          <button id="u-cancel" class="ghost">Abbrechen</button>
          <button id="u-save" class="primary">Anlegen</button>
        </div>
      </div>
    </div>

    <!-- Modal fuer Paket-Add -->
    <div id="package-modal" class="modal-backdrop" hidden>
      <div class="modal">
        <h3 id="package-modal-title">Neues Zugriffspaket</h3>
        <div class="field">
          <label for="p-user">User</label>
          <select id="p-user"></select>
        </div>
        <div class="field">
          <label for="p-target">Ziel</label>
          <select id="p-target"></select>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="p-from">G&uuml;ltig ab</label>
            <input type="datetime-local" id="p-from">
          </div>
          <div class="field">
            <label for="p-until">G&uuml;ltig bis</label>
            <input type="datetime-local" id="p-until">
          </div>
        </div>
        <div class="field">
          <label for="p-duration">Dauer der Allow-Rule beim Klick (Minuten)</label>
          <input type="number" id="p-duration" min="1" max="1440" value="20">
        </div>
        <div class="field">
          <label for="p-note">Notiz <span style="color:#9ca3af; font-weight: 400;">(optional)</span></label>
          <input type="text" id="p-note" placeholder="z.B. Wartung Telefonanlage am 12.05." autocomplete="off">
        </div>
        <div id="p-err" class="err-line"></div>
        <div class="actions">
          <button id="p-cancel" class="ghost">Abbrechen</button>
          <button id="p-save" class="primary">Anlegen</button>
        </div>
      </div>
    </div>
  </main>

  <footer>
    Dynamic Rule &middot; <code>dynamic-access.vonbusch.app</code> &middot; von Busch GmbH
  </footer>

<script>
const __USER_EMAIL = ${JSON.stringify(email)};
const out = document.getElementById('out');
const go = document.getElementById('go');           // nur fuer Admin: Sandbox
const sel = document.getElementById('target');      // nur fuer Admin: Sandbox
const myPackagesEl = document.getElementById('my-packages');
const activeEl = document.getElementById('active');
const adminListEl = document.getElementById('admin-list');
const modal = document.getElementById('modal');
const mTitle = document.getElementById('modal-title');
const mId = document.getElementById('m-id');
const mLabel = document.getElementById('m-label');
const mIp = document.getElementById('m-ip');
const mPort = document.getElementById('m-port');
const mProtocol = document.getElementById('m-protocol');
const mService = document.getElementById('m-service');
const mErr = document.getElementById('m-err');
const mCancel = document.getElementById('m-cancel');
const mSave = document.getElementById('m-save');
let editingId = null;

// User-Modal
const userModal = document.getElementById('user-modal');
const uEmail = document.getElementById('u-email');
const uLabel = document.getElementById('u-label');
const uErr = document.getElementById('u-err');
const uCancel = document.getElementById('u-cancel');
const uSave = document.getElementById('u-save');
const usersListEl = document.getElementById('users-list');

// Package-Modal
const packageModal = document.getElementById('package-modal');
const pUserSel = document.getElementById('p-user');
const pTargetSel = document.getElementById('p-target');
const pFrom = document.getElementById('p-from');
const pUntil = document.getElementById('p-until');
const pDuration = document.getElementById('p-duration');
const pNote = document.getElementById('p-note');
const pErr = document.getElementById('p-err');
const pCancel = document.getElementById('p-cancel');
const pSave = document.getElementById('p-save');
const packagesListEl = document.getElementById('packages-list');

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  } catch (e) { return iso; }
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// --- Tab-Switching ---
document.querySelectorAll('.tab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    const tab = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    document.querySelectorAll('.panel').forEach(function(p) {
      p.classList.toggle('active', p.getAttribute('data-panel') === tab);
    });
    if (tab === 'admin') refreshAdminList();
    if (tab === 'admin-users') refreshUsersList();
    if (tab === 'admin-packages') refreshPackagesList();
  });
});

// --- User-Tab: meine Zugriffspakete (v0.5.0) ---
async function refreshMyPackages() {
  if (!myPackagesEl) return;
  try {
    const r = await fetch('/api/me');
    if (!r.ok) {
      myPackagesEl.innerHTML = '<div class="empty">Fehler beim Laden: ' + escHtml(await r.text()) + '</div>';
      return;
    }
    const j = await r.json();
    const packages = j.packages || [];
    if (packages.length === 0) {
      myPackagesEl.innerHTML = '<div class="empty">Aktuell keine eingeloesten Zugriffspakete f\\u00fcr dich. Sprich mit deinem Admin, wenn du Zugriff brauchst.</div>';
      return;
    }
    const cards = packages.map(function(p) {
      const t = p.target || {};
      const note = p.note ? '<div class="target-id" style="margin-top: 8px; font-style: italic;">' + escHtml(p.note) + '</div>' : '';
      const statusBadge = p.approved
        ? '<span class="badge ok"><span class="dot"></span>freigeschaltet</span>'
        : '<span class="badge warn"><span class="dot"></span>wartet auf Freischaltung</span>';
      const createdInfo = p.created_by
        ? '<div class="target-id" style="margin-top: 4px;">angelegt von ' + escHtml(p.created_by) + '</div>'
        : '';
      const button = p.approved
        ? '<button class="primary" data-pkg="' + escHtml(p.id) + '">Zugriff anfordern</button>'
        : '<button class="primary" disabled title="Ein anderer Admin als der Ersteller muss das Paket erst freischalten (Vier-Augen-Prinzip).">wartet auf Freischaltung</button>';
      return '<div class="card" style="border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 12px;">'
        + '<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">'
        +   '<div style="flex: 1;">'
        +     '<div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">'
        +       '<div style="font-weight: 600; font-size: 16px;">' + escHtml(t.label || p.target_id) + '</div>'
        +       statusBadge
        +     '</div>'
        +     '<div class="target-id" style="margin-top: 4px;">' + escHtml(t.ip || '?') + ':' + escHtml(String(t.port || '?')) + ' / ' + escHtml(t.protocol || '?') + ' &mdash; ' + escHtml(t.service || '') + '</div>'
        +     '<div class="target-id" style="margin-top: 6px;">G&uuml;ltig bis ' + escHtml(fmtDate(p.valid_until)) + ' &middot; Dauer beim Klick: ' + escHtml(String(p.duration_min)) + ' min</div>'
        +     createdInfo
        +     note
        +   '</div>'
        +   button
        + '</div>'
        + '</div>';
    }).join('');
    myPackagesEl.innerHTML = cards;
    myPackagesEl.querySelectorAll('button[data-pkg]').forEach(function(b) {
      b.addEventListener('click', requestViaPackage);
    });
  } catch (e) {
    myPackagesEl.innerHTML = '<div class="empty">Netz-Fehler: ' + escHtml(e.message) + '</div>';
  }
}

async function requestViaPackage(ev) {
  const pkgId = ev.currentTarget.getAttribute('data-pkg');
  ev.currentTarget.disabled = true;
  ev.currentTarget.textContent = 'beantrage ...';
  out.hidden = false;
  out.className = 'out';
  out.innerHTML = '<div class="summary">Beantrage Zugriff &hellip;</div>';
  try {
    const r = await fetch('/api/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ package_id: pkgId }),
    });
    const txt = await r.text();
    if (!r.ok) {
      out.className = 'out err';
      out.innerHTML = '<div class="summary">Fehler ' + r.status + '</div><pre>' + escHtml(txt) + '</pre>';
    } else {
      let parsed = null;
      try { parsed = JSON.parse(txt); } catch (e) {}
      if (parsed && parsed.valid_until) {
        out.className = 'out ok';
        out.innerHTML = '<div class="summary">Zugriff freigeschaltet bis ' + escHtml(fmtDate(parsed.valid_until)) + '</div><pre>' + escHtml(JSON.stringify(parsed, null, 2)) + '</pre>';
      } else {
        out.className = 'out ok';
        out.innerHTML = '<pre>' + escHtml(txt) + '</pre>';
      }
      refreshActive();
      refreshMyPackages();
    }
  } catch (e) {
    out.className = 'out err';
    out.innerHTML = '<div class="summary">Netz-Fehler</div><pre>' + escHtml(e.message) + '</pre>';
  } finally {
    // Karte wird ohnehin neu gerendert via refreshMyPackages
  }
}

// --- User-Tab: aktive Freigaben ---
async function refreshActive() {
  try {
    const r = await fetch('/api/active');
    if (!r.ok) {
      activeEl.innerHTML = '<div class="empty">Fehler beim Laden: ' + escHtml(await r.text()) + '</div>';
      return;
    }
    const j = await r.json();
    if (!j.active || j.active.length === 0) {
      activeEl.innerHTML = '<div class="empty">Keine aktiven Freigaben.</div>';
      return;
    }
    const rows = j.active.map(function(a) {
      return '<tr>'
        + '<td class="target">' + escHtml(a.target_id) + '</td>'
        + '<td class="expiry">' + escHtml(fmtDate(a.valid_until)) + '</td>'
        + '<td class="action"><button class="outline danger" data-id="' + escHtml(a.rule_id) + '">Beenden</button></td>'
      + '</tr>';
    }).join('');
    activeEl.innerHTML = '<table><thead><tr><th>Target</th><th>G&uuml;ltig bis</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
    activeEl.querySelectorAll('button.danger').forEach(function(b) { b.addEventListener('click', revoke); });
  } catch (e) {
    activeEl.innerHTML = '<div class="empty">Netz-Fehler: ' + escHtml(e.message) + '</div>';
  }
}

async function revoke(ev) {
  const id = ev.currentTarget.getAttribute('data-id');
  if (!confirm('Freigabe vorzeitig beenden?\\n\\nRule: ' + id)) return;
  ev.currentTarget.disabled = true;
  ev.currentTarget.textContent = 'beende ...';
  const r = await fetch('/api/rule/' + encodeURIComponent(id), { method: 'DELETE' });
  if (r.ok) { refreshActive(); }
  else { alert('Fehler: ' + (await r.text())); refreshActive(); }
}

if (go) {
  go.addEventListener('click', async function() {
    const id = sel.value;
    if (!id) { alert('Bitte Ziel w\\u00e4hlen.'); return; }
    go.disabled = true;
    go.textContent = 'beantrage ...';
    out.hidden = false;
    out.className = 'out';
    out.innerHTML = '<div class="summary">Beantrage Zugriff &hellip;</div>';
    try {
      const r = await fetch('/api/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target_id: id }),
      });
      const txt = await r.text();
      if (!r.ok) {
        out.className = 'out err';
        out.innerHTML = '<div class="summary">Fehler ' + r.status + '</div><pre>' + escHtml(txt) + '</pre>';
      } else {
        let parsed = null;
        try { parsed = JSON.parse(txt); } catch (e) {}
        if (parsed && parsed.valid_until) {
          out.className = 'out ok';
          out.innerHTML = '<div class="summary">Zugriff freigeschaltet bis ' + escHtml(fmtDate(parsed.valid_until)) + '</div><pre>' + escHtml(JSON.stringify(parsed, null, 2)) + '</pre>';
        } else {
          out.className = 'out ok';
          out.innerHTML = '<pre>' + escHtml(txt) + '</pre>';
        }
        refreshActive();
        sel.value = '';
      }
    } catch (e) {
      out.className = 'out err';
      out.innerHTML = '<div class="summary">Netz-Fehler</div><pre>' + escHtml(e.message) + '</pre>';
    } finally {
      go.disabled = false;
      go.textContent = 'Zugriff anfordern';
    }
  });
}

// --- Admin-Tab ---
async function refreshAdminList() {
  if (!adminListEl) return;
  try {
    const r = await fetch('/api/admin/targets');
    if (!r.ok) {
      adminListEl.innerHTML = '<div class="empty">Fehler beim Laden: ' + escHtml(await r.text()) + '</div>';
      return;
    }
    const j = await r.json();
    if (!j.targets || j.targets.length === 0) {
      adminListEl.innerHTML = '<div class="empty">Noch keine Targets. Klick auf &bdquo;Neues Target&ldquo; um zu starten.</div>';
      return;
    }
    const rows = j.targets.map(function(t) {
      const disabled = t.disabled === true;
      const statusBadge = disabled
        ? '<span class="badge muted"><span class="dot"></span>inaktiv</span>'
        : '<span class="badge ok"><span class="dot"></span>aktiv</span>';
      const actions = disabled
        ? '<button class="outline" data-act="enable" data-id="' + escHtml(t.id) + '">Aktivieren</button>'
          + '<button class="outline" data-act="edit" data-id="' + escHtml(t.id) + '">Bearbeiten</button>'
        : '<button class="outline" data-act="edit" data-id="' + escHtml(t.id) + '">Bearbeiten</button>'
          + '<button class="outline danger" data-act="disable" data-id="' + escHtml(t.id) + '">Beenden</button>';
      return '<tr' + (disabled ? ' class="disabled-row"' : '') + '>'
        + '<td>' + escHtml(t.label) + '<div class="target-id">' + escHtml(t.id) + '</div></td>'
        + '<td class="target">' + escHtml(t.ip) + ':' + t.port + '/' + escHtml(t.protocol) + '</td>'
        + '<td>' + escHtml(t.service) + '</td>'
        + '<td>' + statusBadge + '</td>'
        + '<td class="action">' + actions + '</td>'
      + '</tr>';
    }).join('');
    adminListEl.innerHTML = '<table><thead><tr><th>Name</th><th>IP/Port</th><th>Dienst</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
    adminListEl.querySelectorAll('button[data-act]').forEach(function(b) {
      b.addEventListener('click', onAdminAction);
    });
  } catch (e) {
    adminListEl.innerHTML = '<div class="empty">Netz-Fehler: ' + escHtml(e.message) + '</div>';
  }
}

async function onAdminAction(ev) {
  const id = ev.currentTarget.getAttribute('data-id');
  const act = ev.currentTarget.getAttribute('data-act');
  if (act === 'edit') {
    const r = await fetch('/api/admin/targets');
    if (!r.ok) { alert('Konnte Target nicht laden'); return; }
    const j = await r.json();
    const t = (j.targets || []).find(function(x) { return x.id === id; });
    if (!t) { alert('Target nicht mehr vorhanden'); refreshAdminList(); return; }
    openModal(t);
  } else if (act === 'disable') {
    if (!confirm('Target beenden?\\n\\n' + id + '\\n\\nDas Target verschwindet aus dem User-Pulldown. Aktive Freigaben bleiben bestehen, bis sie ablaufen.')) return;
    ev.currentTarget.disabled = true;
    const r = await fetch('/api/admin/targets/' + encodeURIComponent(id), { method: 'DELETE' });
    if (!r.ok) { alert('Fehler: ' + (await r.text())); }
    refreshAdminList();
  } else if (act === 'enable') {
    ev.currentTarget.disabled = true;
    const r = await fetch('/api/admin/targets/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ disabled: false }),
    });
    if (!r.ok) { alert('Fehler: ' + (await r.text())); }
    refreshAdminList();
  }
}

function openModal(target) {
  mErr.textContent = '';
  if (target) {
    editingId = target.id;
    mTitle.textContent = 'Target bearbeiten';
    mId.value = target.id;
    mId.disabled = true;
    mLabel.value = target.label || '';
    mIp.value = target.ip || '';
    mPort.value = target.port || '';
    mProtocol.value = target.protocol || 'tcp';
    mService.value = target.service || '';
  } else {
    editingId = null;
    mTitle.textContent = 'Neues Target';
    mId.value = '';
    mId.disabled = false;
    mLabel.value = '';
    mIp.value = '';
    mPort.value = '';
    mProtocol.value = 'tcp';
    mService.value = '';
  }
  modal.hidden = false;
  setTimeout(function() { (target ? mLabel : mId).focus(); }, 50);
}

function closeModal() { modal.hidden = true; mErr.textContent = ''; }

mCancel.addEventListener('click', closeModal);
modal.addEventListener('click', function(ev) { if (ev.target === modal) closeModal(); });

mSave.addEventListener('click', async function() {
  mErr.textContent = '';
  const payload = {
    label: mLabel.value.trim(),
    ip: mIp.value.trim(),
    port: parseInt(mPort.value, 10),
    protocol: mProtocol.value,
    service: mService.value.trim(),
  };
  let url, method;
  if (editingId) {
    url = '/api/admin/targets/' + encodeURIComponent(editingId);
    method = 'PUT';
  } else {
    payload.id = mId.value.trim();
    url = '/api/admin/targets';
    method = 'POST';
  }
  mSave.disabled = true;
  mSave.textContent = 'speichere ...';
  try {
    const r = await fetch(url, {
      method: method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      mErr.textContent = 'Fehler ' + r.status + ': ' + (await r.text());
      return;
    }
    closeModal();
    refreshAdminList();
  } catch (e) {
    mErr.textContent = 'Netz-Fehler: ' + e.message;
  } finally {
    mSave.disabled = false;
    mSave.textContent = 'Speichern';
  }
});

const adminAddBtn = document.getElementById('admin-add');
if (adminAddBtn) adminAddBtn.addEventListener('click', function() { openModal(null); });

document.addEventListener('keydown', function(ev) {
  if (ev.key === 'Escape' && !modal.hidden) closeModal();
  if (ev.key === 'Escape' && !userModal.hidden) closeUserModal();
  if (ev.key === 'Escape' && !packageModal.hidden) closePackageModal();
});

// --- Admin-Tab: User-Verwaltung (v0.5.0) ---

let __USERS_CACHE = [];
let __TARGETS_CACHE = [];

async function refreshUsersList() {
  if (!usersListEl) return;
  try {
    const r = await fetch('/api/admin/users');
    if (!r.ok) {
      usersListEl.innerHTML = '<div class="empty">Fehler beim Laden: ' + escHtml(await r.text()) + '</div>';
      return;
    }
    const j = await r.json();
    __USERS_CACHE = j.users || [];
    if (__USERS_CACHE.length === 0) {
      usersListEl.innerHTML = '<div class="empty">Noch keine User. Klick auf &bdquo;Neuer User&ldquo; um zu starten.</div>';
      return;
    }
    const rows = __USERS_CACHE.map(function(u) {
      const disabled = u.disabled === true;
      const statusBadge = disabled
        ? '<span class="badge muted"><span class="dot"></span>inaktiv</span>'
        : '<span class="badge ok"><span class="dot"></span>aktiv</span>';
      const actions = disabled
        ? '<button class="outline" data-act="user-enable" data-id="' + escHtml(u.id) + '">Aktivieren</button>'
        : '<button class="outline danger" data-act="user-disable" data-id="' + escHtml(u.id) + '">Deaktivieren</button>';
      return '<tr' + (disabled ? ' class="disabled-row"' : '') + '>'
        + '<td>' + escHtml(u.email) + '<div class="target-id">' + escHtml(u.label || '') + '</div></td>'
        + '<td>' + escHtml(fmtDate(u.created_at)) + '</td>'
        + '<td>' + escHtml(u.created_by || '') + '</td>'
        + '<td>' + statusBadge + '</td>'
        + '<td class="action">' + actions + '</td>'
      + '</tr>';
    }).join('');
    usersListEl.innerHTML = '<table><thead><tr><th>E-Mail</th><th>Angelegt</th><th>Von</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
    usersListEl.querySelectorAll('button[data-act]').forEach(function(b) {
      b.addEventListener('click', onUserAction);
    });
  } catch (e) {
    usersListEl.innerHTML = '<div class="empty">Netz-Fehler: ' + escHtml(e.message) + '</div>';
  }
}

async function onUserAction(ev) {
  const id = ev.currentTarget.getAttribute('data-id');
  const act = ev.currentTarget.getAttribute('data-act');
  if (act === 'user-disable') {
    if (!confirm('User deaktivieren?\\n\\nDeaktivierte User k\\u00f6nnen keine neuen Pakete erhalten. Bestehende Pakete bleiben unber\\u00fchrt.')) return;
    ev.currentTarget.disabled = true;
    const r = await fetch('/api/admin/users/' + encodeURIComponent(id), { method: 'DELETE' });
    if (!r.ok) { alert('Fehler: ' + (await r.text())); }
    refreshUsersList();
  } else if (act === 'user-enable') {
    ev.currentTarget.disabled = true;
    const r = await fetch('/api/admin/users/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ disabled: false }),
    });
    if (!r.ok) { alert('Fehler: ' + (await r.text())); }
    refreshUsersList();
  }
}

function openUserModal() {
  uErr.textContent = '';
  uEmail.value = '';
  uLabel.value = '';
  userModal.hidden = false;
  setTimeout(function() { uEmail.focus(); }, 50);
}
function closeUserModal() { userModal.hidden = true; uErr.textContent = ''; }

uCancel.addEventListener('click', closeUserModal);
userModal.addEventListener('click', function(ev) { if (ev.target === userModal) closeUserModal(); });

uSave.addEventListener('click', async function() {
  uErr.textContent = '';
  const payload = {
    email: uEmail.value.trim(),
    label: uLabel.value.trim() || null,
  };
  uSave.disabled = true;
  uSave.textContent = 'speichere ...';
  try {
    const r = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      uErr.textContent = 'Fehler ' + r.status + ': ' + (await r.text());
      return;
    }
    closeUserModal();
    refreshUsersList();
  } catch (e) {
    uErr.textContent = 'Netz-Fehler: ' + e.message;
  } finally {
    uSave.disabled = false;
    uSave.textContent = 'Anlegen';
  }
});

const usersAddBtn = document.getElementById('users-add');
if (usersAddBtn) usersAddBtn.addEventListener('click', openUserModal);

// --- Admin-Tab: Paket-Verwaltung (v0.5.0) ---

async function refreshPackagesList() {
  if (!packagesListEl) return;
  try {
    // User- und Target-Cache parallel laden, falls noch nicht da.
    const promises = [fetch('/api/admin/packages')];
    if (__USERS_CACHE.length === 0) promises.push(fetch('/api/admin/users'));
    if (__TARGETS_CACHE.length === 0) promises.push(fetch('/api/admin/targets'));
    const responses = await Promise.all(promises);
    const pkgRes = responses[0];
    if (!pkgRes.ok) {
      packagesListEl.innerHTML = '<div class="empty">Fehler beim Laden: ' + escHtml(await pkgRes.text()) + '</div>';
      return;
    }
    const pkgJson = await pkgRes.json();
    let idx = 1;
    if (__USERS_CACHE.length === 0 && responses[idx]) {
      const j = await responses[idx].json();
      __USERS_CACHE = j.users || [];
      idx++;
    }
    if (__TARGETS_CACHE.length === 0 && responses[idx]) {
      const j = await responses[idx].json();
      __TARGETS_CACHE = j.targets || [];
    }
    const userById = Object.fromEntries(__USERS_CACHE.map(function(u) { return [u.id, u]; }));
    const targetById = Object.fromEntries(__TARGETS_CACHE.map(function(t) { return [t.id, t]; }));

    const packages = pkgJson.packages || [];
    if (packages.length === 0) {
      packagesListEl.innerHTML = '<div class="empty">Noch keine Pakete. Klick auf &bdquo;Neues Paket&ldquo; um zu starten.</div>';
      return;
    }
    const rows = packages.map(function(p) {
      const u = userById[p.user_id] || { email: p.user_id, label: '' };
      const t = targetById[p.target_id] || { label: p.target_id, ip: '?', port: '?' };
      const approved = p.approved === true;
      const used = !!p.used_at;
      let statusBadge;
      if (used) {
        statusBadge = '<span class="badge muted"><span class="dot"></span>genutzt</span>';
      } else if (approved) {
        statusBadge = '<span class="badge ok"><span class="dot"></span>freigeschaltet</span>';
      } else {
        statusBadge = '<span class="badge warn"><span class="dot"></span>wartet auf Freischaltung</span>';
      }
      const isOwn = (p.created_by || '').toLowerCase() === (__USER_EMAIL || '').toLowerCase();
      let actions = '';
      if (!approved && !used) {
        if (isOwn) {
          actions += '<button class="outline" disabled title="Vier-Augen-Prinzip: eigene Pakete nicht freischaltbar">Freischalten</button>';
        } else {
          actions += '<button class="outline" data-act="pkg-approve" data-id="' + escHtml(p.id) + '">Freischalten</button>';
        }
      } else if (approved && !used) {
        actions += '<button class="outline" data-act="pkg-revoke" data-id="' + escHtml(p.id) + '">Freischaltung zur&uuml;cknehmen</button>';
      }
      actions += '<button class="outline danger" data-act="pkg-delete" data-id="' + escHtml(p.id) + '">L&ouml;schen</button>';
      return '<tr>'
        + '<td>' + escHtml(u.email) + (u.label ? '<div class="target-id">' + escHtml(u.label) + '</div>' : '') + '</td>'
        + '<td>' + escHtml(t.label || p.target_id) + '<div class="target-id">' + escHtml(t.ip || '') + ':' + escHtml(String(t.port || '')) + '</div></td>'
        + '<td class="expiry">' + escHtml(fmtDate(p.valid_from)) + '<div class="target-id">bis ' + escHtml(fmtDate(p.valid_until)) + '</div></td>'
        + '<td>' + escHtml(String(p.duration_min)) + ' min</td>'
        + '<td>' + statusBadge + (approved && p.approved_by ? '<div class="target-id">durch ' + escHtml(p.approved_by) + '</div>' : '') + '</td>'
        + '<td class="action">' + actions + '</td>'
      + '</tr>';
    }).join('');
    packagesListEl.innerHTML = '<table><thead><tr><th>User</th><th>Ziel</th><th>G&uuml;ltigkeit</th><th>Dauer</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
    packagesListEl.querySelectorAll('button[data-act]').forEach(function(b) {
      b.addEventListener('click', onPackageAction);
    });
  } catch (e) {
    packagesListEl.innerHTML = '<div class="empty">Netz-Fehler: ' + escHtml(e.message) + '</div>';
  }
}

async function onPackageAction(ev) {
  const id = ev.currentTarget.getAttribute('data-id');
  const act = ev.currentTarget.getAttribute('data-act');
  if (act === 'pkg-approve') {
    if (!confirm('Paket freischalten?\\n\\nDamit wird es f\\u00fcr den User sichtbar und nutzbar.')) return;
    ev.currentTarget.disabled = true;
    const r = await fetch('/api/admin/packages/' + encodeURIComponent(id) + '/approve', { method: 'POST' });
    if (!r.ok) { alert('Fehler: ' + (await r.text())); }
    refreshPackagesList();
  } else if (act === 'pkg-revoke') {
    if (!confirm('Freischaltung zur\\u00fccknehmen?\\n\\nDer User verliert den Zugriff auf das Paket. Bereits genutzte Allow-Rules bleiben bis Ablauf bestehen.')) return;
    ev.currentTarget.disabled = true;
    const r = await fetch('/api/admin/packages/' + encodeURIComponent(id) + '/approval', { method: 'DELETE' });
    if (!r.ok) { alert('Fehler: ' + (await r.text())); }
    refreshPackagesList();
  } else if (act === 'pkg-delete') {
    if (!confirm('Paket endg\\u00fcltig l\\u00f6schen?\\n\\nDas l\\u00e4sst sich nicht r\\u00fcckg\\u00e4ngig machen. Aktive Allow-Rules bleiben bestehen, bis sie ablaufen.')) return;
    ev.currentTarget.disabled = true;
    const r = await fetch('/api/admin/packages/' + encodeURIComponent(id), { method: 'DELETE' });
    if (!r.ok) { alert('Fehler: ' + (await r.text())); }
    refreshPackagesList();
  }
}

async function openPackageModal() {
  pErr.textContent = '';
  // Listen IMMER frisch laden -- der Cache koennte veraltet sein
  // (z. B. neu angelegtes Target/User aus dem anderen Tab).
  pUserSel.innerHTML = '<option value="">l&auml;dt &hellip;</option>';
  pTargetSel.innerHTML = '<option value="">l&auml;dt &hellip;</option>';
  packageModal.hidden = false;

  try {
    const [uRes, tRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/targets'),
    ]);
    if (uRes.ok) {
      const j = await uRes.json();
      __USERS_CACHE = j.users || [];
    }
    if (tRes.ok) {
      const j = await tRes.json();
      __TARGETS_CACHE = j.targets || [];
    }
  } catch (e) {
    pErr.textContent = 'Listen konnten nicht geladen werden: ' + e.message;
  }

  const activeUsers = __USERS_CACHE.filter(function(u) { return u.disabled !== true; });
  pUserSel.innerHTML = activeUsers.length === 0
    ? '<option value="">(Keine aktiven User)</option>'
    : '<option value="">&mdash; bitte w&auml;hlen &mdash;</option>' + activeUsers.map(function(u) {
        return '<option value="' + escHtml(u.id) + '">' + escHtml(u.email) + (u.label ? ' (' + escHtml(u.label) + ')' : '') + '</option>';
      }).join('');
  const activeTargets = __TARGETS_CACHE.filter(function(t) { return t.disabled !== true; });
  pTargetSel.innerHTML = activeTargets.length === 0
    ? '<option value="">(Keine aktiven Targets)</option>'
    : '<option value="">&mdash; bitte w&auml;hlen &mdash;</option>' + activeTargets.map(function(t) {
        return '<option value="' + escHtml(t.id) + '">' + escHtml(t.label) + ' &mdash; ' + escHtml(t.ip) + ':' + t.port + '/' + escHtml(t.protocol) + '</option>';
      }).join('');
  // Default-Werte: Gueltig ab jetzt, bis +1 Tag, Dauer 20 min
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  pFrom.value = toLocalIso(now);
  pUntil.value = toLocalIso(tomorrow);
  pDuration.value = '20';
  pNote.value = '';
  setTimeout(function() { pUserSel.focus(); }, 50);
}
function closePackageModal() { packageModal.hidden = true; pErr.textContent = ''; }

function toLocalIso(d) {
  // Format fuer <input type="datetime-local"> ohne Sekunden, in Local-Time.
  const pad = function(n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate())
    + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

pCancel.addEventListener('click', closePackageModal);
packageModal.addEventListener('click', function(ev) { if (ev.target === packageModal) closePackageModal(); });

pSave.addEventListener('click', async function() {
  pErr.textContent = '';
  const userId = pUserSel.value;
  const targetId = pTargetSel.value;
  const fromVal = pFrom.value;
  const untilVal = pUntil.value;
  const duration = parseInt(pDuration.value, 10);
  const note = pNote.value.trim() || null;
  if (!userId) { pErr.textContent = 'User w\\u00e4hlen'; return; }
  if (!targetId) { pErr.textContent = 'Ziel w\\u00e4hlen'; return; }
  if (!fromVal || !untilVal) { pErr.textContent = 'G\\u00fcltigkeit angeben'; return; }
  // datetime-local liefert "YYYY-MM-DDTHH:MM" in Local-Time. In ISO mit Z umrechnen.
  const validFrom = new Date(fromVal).toISOString();
  const validUntil = new Date(untilVal).toISOString();
  const payload = {
    user_id: userId,
    target_id: targetId,
    valid_from: validFrom,
    valid_until: validUntil,
    duration_min: duration,
    note: note,
  };
  pSave.disabled = true;
  pSave.textContent = 'speichere ...';
  try {
    const r = await fetch('/api/admin/packages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      pErr.textContent = 'Fehler ' + r.status + ': ' + (await r.text());
      return;
    }
    closePackageModal();
    refreshPackagesList();
  } catch (e) {
    pErr.textContent = 'Netz-Fehler: ' + e.message;
  } finally {
    pSave.disabled = false;
    pSave.textContent = 'Anlegen';
  }
});

const packagesAddBtn = document.getElementById('packages-add');
if (packagesAddBtn) packagesAddBtn.addEventListener('click', openPackageModal);

refreshMyPackages();
refreshActive();
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
