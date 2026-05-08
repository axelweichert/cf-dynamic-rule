// GET /api/active - aktive Rules
//   Standard-User: nur eigene Rules.
//   Admin (ADMIN_EMAILS): alle Rules mit unserem Prefix, plus 'user'-Feld
//                         pro Eintrag, damit das UI eine Spalte "User" zeigen kann.
// DELETE /api/rule/:id - vorzeitiges Beenden einer eigenen Rule (Admins koennen alle).

import type { Env } from "../types.js";
import { requireUser } from "../lib/jwt.js";
import { isAdmin } from "../lib/admin.js";
import { audit } from "../lib/audit.js";
import { deleteRule, listRules, parseManagedDescription } from "../lib/cf-api.js";

export async function handleActive(request: Request, env: Env): Promise<Response> {
  let user;
  try {
    user = await requireUser(request, env);
  } catch (err) {
    return new Response(`Unauthorized: ${(err as Error).message}`, { status: 401 });
  }

  const admin = isAdmin(user.email, env);
  const all = await listRules(env);
  const prefix = env.RULE_TAG_PREFIX;
  const now = new Date();
  const out = [];
  let nUnparsed = 0;
  let nExpired = 0;
  let nNotMine = 0;
  for (const r of all) {
    const parsed = parseManagedDescription(r.description ?? "", prefix);
    if (!parsed) {
      nUnparsed++;
      continue;
    }
    if (parsed.expiresAt <= now) {
      nExpired++;
      continue;
    }
    if (!admin && parsed.email.toLowerCase() !== user.email.toLowerCase()) {
      nNotMine++;
      continue;
    }
    out.push({
      rule_id: r.id,
      name: r.name,
      target_id: extractTargetId(r.name, prefix),
      user: parsed.email,
      valid_until: parsed.expiresAt.toISOString(),
    });
  }
  console.log("active_debug", JSON.stringify({
    caller: user.email,
    admin,
    prefix,
    total_rules: all.length,
    unparsed: nUnparsed,
    expired: nExpired,
    not_mine: nNotMine,
    returned: out.length,
    sample_descriptions: all.slice(0, 5).map((r) => r.description ?? ""),
  }));
  return Response.json({ active: out, scope: admin ? "all" : "self" });
}

export async function handleRevoke(
  request: Request,
  env: Env,
  ruleId: string,
): Promise<Response> {
  let user;
  try {
    user = await requireUser(request, env);
  } catch (err) {
    return new Response(`Unauthorized: ${(err as Error).message}`, { status: 401 });
  }

  // Standard-User: nur eigene Rules. Admin: alle Rules mit unserem Prefix.
  const admin = isAdmin(user.email, env);
  const all = await listRules(env);
  const prefix = env.RULE_TAG_PREFIX;
  const target = all.find((r) => r.id === ruleId);
  if (!target) return new Response("not found", { status: 404 });
  const parsed = parseManagedDescription(target.description ?? "", prefix);
  if (!parsed) {
    return new Response("forbidden", { status: 403 });
  }
  if (!admin && parsed.email.toLowerCase() !== user.email.toLowerCase()) {
    return new Response("forbidden", { status: 403 });
  }

  try {
    await deleteRule(env, ruleId);
  } catch (err) {
    return new Response(`gateway api error: ${(err as Error).message}`, { status: 500 });
  }

  await audit(env, {
    ts: new Date().toISOString(),
    event: "manual_revoke",
    user: user.email,
    rule_id: ruleId,
    details: {
      rule_owner: parsed.email,
      by_admin: admin && parsed.email.toLowerCase() !== user.email.toLowerCase(),
    },
  });

  return Response.json({ revoked: ruleId });
}

function extractTargetId(name: string, prefix: string): string {
  // Format: "<prefix>-<target_id>-<email>"
  const stripped = name.startsWith(`${prefix}-`) ? name.slice(prefix.length + 1) : name;
  const lastDash = stripped.lastIndexOf("-");
  if (lastDash < 0) return stripped;
  return stripped.slice(0, lastDash);
}
