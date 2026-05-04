// HTML-UI Handler. Minimal, ohne Build-Pipeline.

import type { Env } from "../types.js";
import { requireUser } from "../lib/jwt.js";
import { listTargets } from "../lib/targets.js";

export async function handleUi(request: Request, env: Env): Promise<Response> {
  let user: { email: string };
  try {
    user = await requireUser(request, env);
  } catch (err) {
    return new Response(`Unauthorized: ${(err as Error).message}`, { status: 401 });
  }

  const targets = await listTargets(env);
  const ttl = env.RULE_TTL_MINUTES;

  const options = targets
    .map(
      (t) =>
        `<option value="${escapeHtml(t.id)}">${escapeHtml(t.label)} (${escapeHtml(t.ip)}:${t.port}/${escapeHtml(t.protocol)})</option>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>cf-dynamic-rule</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; }
    h1 { margin-bottom: 0.25rem; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 1.5rem; }
    label { display: block; margin: 1rem 0 0.25rem; font-weight: 600; }
    select, button { font: inherit; padding: 0.5rem 0.75rem; }
    select { width: 100%; }
    button { background: #0a5; color: #fff; border: 0; cursor: pointer; margin-top: 1rem; }
    button:disabled { background: #888; }
    #out { margin-top: 1.5rem; padding: 1rem; border-radius: 4px; white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 0.85rem; }
    .ok { background: #e6f7ec; border: 1px solid #0a5; }
    .err { background: #fce8e8; border: 1px solid #c33; }
    h2 { margin-top: 2rem; font-size: 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.4rem; border-bottom: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>cf-dynamic-rule</h1>
  <div class="meta">Angemeldet als <strong>${escapeHtml(user.email)}</strong> &middot; TTL ${ttl} min</div>

  <label for="target">Ziel auswaehlen</label>
  <select id="target">
    <option value="">-- bitte waehlen --</option>
    ${options}
  </select>

  <button id="go">Zugriff anfordern</button>

  <div id="out" hidden></div>

  <h2>Aktive Freigaben</h2>
  <div id="active">laedt...</div>

<script>
const out = document.getElementById('out');
const go = document.getElementById('go');
const sel = document.getElementById('target');
const activeEl = document.getElementById('active');

async function refreshActive() {
  try {
    const r = await fetch('/api/active');
    const j = await r.json();
    if (!j.active || j.active.length === 0) {
      activeEl.textContent = 'Keine aktiven Freigaben.';
      return;
    }
    const rows = j.active.map(a => '<tr><td>' + a.target_id + '</td><td>' + a.valid_until + '</td><td><button data-id="' + a.rule_id + '" class="rev">Beenden</button></td></tr>').join('');
    activeEl.innerHTML = '<table><thead><tr><th>Target</th><th>Gueltig bis</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
    document.querySelectorAll('button.rev').forEach(b => b.addEventListener('click', revoke));
  } catch (e) {
    activeEl.textContent = 'Fehler: ' + e.message;
  }
}

async function revoke(ev) {
  const id = ev.target.getAttribute('data-id');
  if (!confirm('Freigabe ' + id + ' beenden?')) return;
  const r = await fetch('/api/rule/' + id, { method: 'DELETE' });
  if (r.ok) refreshActive();
  else alert('Fehler: ' + (await r.text()));
}

go.addEventListener('click', async () => {
  const id = sel.value;
  if (!id) { alert('Bitte Ziel waehlen.'); return; }
  go.disabled = true;
  out.hidden = false;
  out.className = '';
  out.textContent = 'Beantrage...';
  try {
    const r = await fetch('/api/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target_id: id }),
    });
    const txt = await r.text();
    if (!r.ok) {
      out.className = 'err';
      out.textContent = 'Fehler ' + r.status + ': ' + txt;
    } else {
      out.className = 'ok';
      out.textContent = txt;
      refreshActive();
    }
  } catch (e) {
    out.className = 'err';
    out.textContent = 'Netz-Fehler: ' + e.message;
  } finally {
    go.disabled = false;
  }
});

refreshActive();
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
