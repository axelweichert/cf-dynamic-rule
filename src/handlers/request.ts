// POST /api/request - erstellt eine zeitlich begrenzte Allow-Rule.
//
// Zwei Pfade ab v0.5.0:
//   1. package_id  -> Standard-User-Pfad. Validiert User + Zeitfenster + Approval,
//                     nutzt duration_min aus dem Paket, markiert das Paket als used.
//   2. target_id   -> Admin-Direkt-Pfad. Klassisches Self-Service wie in v0.4.x,
//                     nur fuer ADMIN_EMAILS. Nutzt RULE_TTL_MINUTES.
//
// Standard-User koennen NICHT mehr direkt target_id schicken -- das ist seit
// Einfuehrung der Pakete ein Admin-Reservat (Sandbox/Notfall).

import type { Env } from "../types.js";
import { requireUser } from "../lib/jwt.js";
import { isAdmin } from "../lib/admin.js";
import { getTarget } from "../lib/targets.js";
import { audit } from "../lib/audit.js";
import { isValidTargetIp, isValidPort } from "../lib/admin.js";
import {
  buildManagedDescription,
  createAllowRule,
  listRules,
  parseManagedDescription,
} from "../lib/cf-api.js";
import { getPackage, getUser, markPackageUsed } from "../lib/db.js";

interface RequestBody {
  package_id?: string;
  target_id?: string;
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  let user;
  try {
    user = await requireUser(request, env);
  } catch (err) {
    return new Response(`Unauthorized: ${(err as Error).message}`, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (body.package_id) {
    return handleViaPackage(request, env, user.email, body.package_id);
  }
  if (body.target_id) {
    if (!isAdmin(user.email, env)) {
      return new Response(
        "target_id direkt ist seit v0.5.0 Admins vorbehalten -- Standard-User: package_id schicken.",
        { status: 403 },
      );
    }
    return handleViaTargetDirect(env, user.email, body.target_id);
  }
  return new Response("package_id oder target_id required", { status: 400 });
}

// --- Standard-User-Pfad: Paket einloesen ---------------------------------

async function handleViaPackage(
  _request: Request,
  env: Env,
  email: string,
  packageId: string,
): Promise<Response> {
  const pkg = await getPackage(env, packageId);
  if (!pkg) return new Response("package not found", { status: 404 });

  // Owner-Check: das Paket muss zur eingeloggten Email gehoeren.
  const owner = await getUser(env, pkg.user_id);
  if (!owner || owner.disabled) {
    return new Response("package owner not active", { status: 403 });
  }
  if (owner.email.toLowerCase() !== email.toLowerCase()) {
    return new Response("package not assigned to you", { status: 403 });
  }

  if (!pkg.approved) {
    return new Response("package not yet approved", { status: 403 });
  }
  if (pkg.used_at) {
    return new Response("package already used", { status: 409 });
  }

  const now = new Date();
  const validFrom = new Date(pkg.valid_from);
  const validUntil = new Date(pkg.valid_until);
  if (now < validFrom) {
    return new Response(
      `package not yet valid (starts ${pkg.valid_from})`,
      { status: 403 },
    );
  }
  if (now > validUntil) {
    return new Response(
      `package expired (ended ${pkg.valid_until})`,
      { status: 403 },
    );
  }

  const target = await getTarget(env, pkg.target_id);
  if (!target || target.disabled === true) {
    return new Response("target not found or disabled", { status: 404 });
  }
  if (!isValidTargetIp(target.ip)) {
    return new Response(
      `target has invalid ip: ${target.ip} (expected RFC1918 IPv4 single host)`,
      { status: 500 },
    );
  }
  if (!isValidPort(target.port)) {
    return new Response(
      `target has invalid port: ${target.port} (expected 1..65535)`,
      { status: 500 },
    );
  }

  // Doppelte aktive Rule fuer dasselbe Target+User vermeiden.
  // Gleiche Logik wie im Admin-Pfad.
  const prefix = env.RULE_TAG_PREFIX;
  const existing = await listRules(env);
  for (const r of existing) {
    const parsed = parseManagedDescription(r.description ?? "", prefix);
    if (
      parsed &&
      parsed.email === email &&
      parsed.expiresAt > now &&
      r.name.includes(target.id)
    ) {
      return Response.json(
        {
          error: "active rule exists",
          rule_id: r.id,
          valid_until: parsed.expiresAt.toISOString(),
        },
        { status: 409 },
      );
    }
  }

  const ttlMin = pkg.duration_min;
  const expiresAt = new Date(Date.now() + ttlMin * 60_000);
  const precedence = parseInt(env.RULE_PRECEDENCE, 10);
  const ruleName = `${prefix}-${target.id}-${email}`.slice(0, 100);

  let created;
  try {
    created = await createAllowRule(env, {
      name: ruleName,
      description: buildManagedDescription(prefix, email, expiresAt),
      precedence,
      email,
      ip: target.ip,
      port: target.port,
    });
  } catch (err) {
    await audit(env, {
      ts: new Date().toISOString(),
      event: "error",
      user: email,
      target_id: target.id,
      reason: (err as Error).message,
      details: { package_id: packageId },
    });
    return new Response(`gateway api error: ${(err as Error).message}`, { status: 500 });
  }

  // Paket als verbraucht markieren. Bei DB-Fail nicht den Apply rollback'en --
  // die Rule existiert ja schon.
  try {
    await markPackageUsed(env, packageId, created.id);
  } catch (err) {
    console.error("mark_package_used_failed", err);
  }

  await audit(env, {
    ts: new Date().toISOString(),
    event: "package_used",
    user: email,
    target_id: target.id,
    rule_id: created.id,
    ttl_minutes: ttlMin,
    expires_at: expiresAt.toISOString(),
    details: { package_id: packageId },
  });

  return Response.json({
    rule_id: created.id,
    target_id: target.id,
    granted_to: email,
    valid_until: expiresAt.toISOString(),
    ttl_minutes: ttlMin,
    package_id: packageId,
  });
}

// --- Admin-Direkt-Pfad: target_id wie in v0.4.x --------------------------

async function handleViaTargetDirect(
  env: Env,
  email: string,
  targetId: string,
): Promise<Response> {
  const target = await getTarget(env, targetId);
  if (!target) return new Response("target not found", { status: 404 });
  if (target.disabled === true) {
    return new Response("target not found", { status: 404 });
  }

  if (!isValidTargetIp(target.ip)) {
    return new Response(
      `target has invalid ip: ${target.ip} (expected RFC1918 IPv4 single host)`,
      { status: 500 },
    );
  }
  if (!isValidPort(target.port)) {
    return new Response(
      `target has invalid port: ${target.port} (expected 1..65535)`,
      { status: 500 },
    );
  }

  const prefix = env.RULE_TAG_PREFIX;
  const now = new Date();
  const existing = await listRules(env);
  for (const r of existing) {
    const parsed = parseManagedDescription(r.description ?? "", prefix);
    if (
      parsed &&
      parsed.email === email &&
      parsed.expiresAt > now &&
      r.name.includes(target.id)
    ) {
      return Response.json(
        {
          error: "active rule exists",
          rule_id: r.id,
          valid_until: parsed.expiresAt.toISOString(),
        },
        { status: 409 },
      );
    }
  }

  const ttlMin = parseInt(env.RULE_TTL_MINUTES, 10);
  const expiresAt = new Date(Date.now() + ttlMin * 60_000);
  const precedence = parseInt(env.RULE_PRECEDENCE, 10);
  const ruleName = `${prefix}-${target.id}-${email}`.slice(0, 100);

  let created;
  try {
    created = await createAllowRule(env, {
      name: ruleName,
      description: buildManagedDescription(prefix, email, expiresAt),
      precedence,
      email,
      ip: target.ip,
      port: target.port,
    });
  } catch (err) {
    await audit(env, {
      ts: new Date().toISOString(),
      event: "error",
      user: email,
      target_id: target.id,
      reason: (err as Error).message,
    });
    return new Response(`gateway api error: ${(err as Error).message}`, { status: 500 });
  }

  await audit(env, {
    ts: new Date().toISOString(),
    event: "request",
    user: email,
    target_id: target.id,
    rule_id: created.id,
    ttl_minutes: ttlMin,
    expires_at: expiresAt.toISOString(),
  });

  return Response.json({
    rule_id: created.id,
    target_id: target.id,
    granted_to: email,
    valid_until: expiresAt.toISOString(),
    ttl_minutes: ttlMin,
  });
}
