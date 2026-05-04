// HTML-UI Handler. Minimal, ohne Build-Pipeline.
// 0.3.0: helles Cloudflare-Dashboard-Style UI mit Header, Status-Badges, Logout.

import type { Env, Target } from "../types.js";
import { requireUser } from "../lib/jwt.js";
import { listTargets } from "../lib/targets.js";

const VON_BUSCH_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 546.42 118.1" aria-label="von Busch"><path fill="#fff" d="M513.89,50V163.78h10.49V133c0-11.59.91-25.67,15.33-25.67,12.19,0,13,9.39,13,19.87v36.56h10.48V125.29c0-15.18-3.93-28.15-21-28.15-7.6,0-13.24,3.45-17.56,9.66l-.26-.27V50Zm-20.58,53.67a32.06,32.06,0,0,0-19-6.49c-18.09,0-32.9,14.91-32.9,34.22,0,19.59,14.15,34.22,32.77,34.22,7.34,0,13.5-2.35,19.53-6.63V144.19h-.27c-5.11,7-11.27,11.18-20.05,11.18-12.84,0-21.23-11.18-21.23-24s9-24,21.76-24c8.25,0,14.28,4.42,19.13,10.9h.26ZM425,109.15c-2.75-6.76-9.31-12-16.39-12a18,18,0,0,0-18.35,18.36c0,20.41,27.79,15.45,27.79,29.93a9.6,9.6,0,0,1-10,9.94c-6.95,0-10-4.28-12.58-10.35l-9.31,4.14c3.28,10.21,11.4,16.42,21.76,16.42a20.66,20.66,0,0,0,20.84-21.11c0-10.9-7.08-15.46-14.29-18.63s-14.28-5.38-14.28-11.31c0-4.14,3.93-7.18,7.6-7.18s6.94,3.18,8.39,6.63ZM330,98.94H319.52v37.39c0,17.24,6.16,29.25,24.38,29.25s24.38-12,24.38-29.25V98.94H357.79v36.14c0,10.9-1.18,20.29-13.89,20.29S330,146,330,135.08ZM252.94,70.52h4.32c13.5,0,22.94,1.65,22.94,17.38,0,16.14-10.62,17.66-23.07,17.66h-4.19Zm-11,93.26h22.93c19.53,0,35.39-8.28,35.39-29,0-12.42-6.94-23.59-18.74-26.63,6.68-4.69,9.7-11.86,9.7-20.28,0-21.25-15.07-28.14-33-28.14H241.93Zm11-48.28h9.57c12.05,0,26.73,2.34,26.73,18.48,0,15.87-13,19-25.29,19h-11ZM179.28,98.94H168.79v64.84h10.49V133c0-11.59.92-25.67,15.33-25.67,12.19,0,13,9.39,13,19.87v36.56h10.48V125.29c0-15.18-3.93-28.15-21-28.15-7.6,0-13.24,3.45-17.56,9.66h-.26Zm-61.21,8.41c13,0,21.89,10.9,21.89,24s-8.91,24-21.89,24-21.89-10.77-21.89-24,8.91-24,21.89-24m0,58.23c18,0,32.37-15,32.37-34.08s-14.28-34.36-32.37-34.36S85.7,112.46,85.7,131.5s14.41,34.08,32.37,34.08M28.68,98.94H16.75L47,168.06,77.18,98.94H65.38L47,142.54Z" transform="translate(-16.75 -49.96)"/></svg>`;

const CSS = `
  * { box-sizing: border-box; }
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
  header .user a {
    color: #9ca3af; text-decoration: none; padding: 6px 10px; border-radius: 4px;
    border: 1px solid #2a2a2a; transition: all 0.15s;
  }
  header .user a:hover { color: #fff; border-color: #3a3a3a; background: #151515; }

  main {
    flex: 1;
    max-width: 880px;
    width: 100%;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }
  h1.page { font-size: 22px; font-weight: 600; margin: 0 0 6px; color: #111827; }
  p.lede { color: #4b5563; margin: 0 0 24px; }

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
  .card.intro { background: #fafbfc; }
  .card.intro p { margin: 0; color: #4b5563; font-size: 13px; }
  .card.intro p + p { margin-top: 8px; }

  label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #374151; }
  select {
    width: 100%; font-family: inherit; font-size: 14px;
    padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px;
    background: #fff; color: #111827;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  select:focus { outline: none; border-color: #0051c3; box-shadow: 0 0 0 3px rgba(0,81,195,0.12); }

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

  .actions { margin-top: 16px; }

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
  td.action { width: 100px; text-align: right; }
  .empty { color: #6b7280; font-size: 13px; text-align: center; padding: 24px; font-style: italic; }

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
  const html = renderHtml(user.email, targets, ttl);

  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function renderHtml(email: string, targets: Target[], ttl: string): string {
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
  <title>cf-dynamic-rule &mdash; Self-Service Zero Trust</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>${CSS}</style>
</head>
<body>
  <header>
    <div class="brand">
      ${VON_BUSCH_LOGO_SVG}
      <span class="sep"></span>
      <span class="app-name">cf-dynamic-rule</span>
    </div>
    <div class="user">
      <span class="email">${escapeHtml(email)}</span>
      <a href="/cdn-cgi/access/logout" title="Aus Cloudflare Access ausloggen (alle Apps)">Logout</a>
    </div>
  </header>

  <main>
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
      <h2>Neuer Zugriff</h2>
      <label for="target">Ziel ausw&auml;hlen</label>
      <select id="target" ${targets.length === 0 ? "disabled" : ""}>
        ${targets.length === 0 ? `<option value="">(Keine Targets verf&uuml;gbar)</option>` : `<option value="">&mdash; bitte w&auml;hlen &mdash;</option>`}
        ${options}
      </select>
      <div class="actions">
        <button id="go" class="primary" ${targets.length === 0 ? "disabled" : ""}>Zugriff anfordern</button>
      </div>
      <div id="out" hidden></div>
    </div>

    <div class="card">
      <h2>Aktive Freigaben</h2>
      <div id="active"><div class="empty">l&auml;dt &hellip;</div></div>
    </div>
  </main>

  <footer>
    cf-dynamic-rule &middot; <code>dynamic-access.vonbusch.app</code> &middot; von Busch GmbH
  </footer>

<script>
const out = document.getElementById('out');
const go = document.getElementById('go');
const sel = document.getElementById('target');
const activeEl = document.getElementById('active');

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  } catch (e) { return iso; }
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

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
  if (r.ok) {
    refreshActive();
  } else {
    alert('Fehler: ' + (await r.text()));
    refreshActive();
  }
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
