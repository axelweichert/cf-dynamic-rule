// POST /api/request - erstellt eine zeitlich begrenzte Allow-Rule.

import type { Env } from "../types.js";
import { requireUser } from "../lib/jwt.js";
import { getTarget } from "../lib/targets.js";
import { audit } from "../lib/audit.js";
import { isValidIpv4OrCidr, isValidPort } from "../lib/admin.js";
import {
  buildManagedDescription,
  createAllowRule,
  listRules,
  parseManagedDescription,
} from "../lib/cf-api.js";

interface RequestBody {
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
  const targetId = body.target_id;
  if (!targetId) return new Response("target_id required", { status: 400 });

  const target = await getTarget(env, targetId);
  if (!target) return new Response("target not found", { status: 404 });
  if (target.disabled === true) {
    // Soft-deleted Target. Behandeln wie nicht vorhanden, damit User es
    // nicht "wiederbeleben" koennen indem sie es per ID-Raten anfordern.
    return new Response("target not found", { status: 404 });
  }

  // Defensive: KV-Inhalt validieren bevor er in den Gateway-Filter geht.
  // Gateway-Filter-Parser akzeptiert nur IPv4-Literale oder CIDR.
  if (!isValidIpv4OrCidr(target.ip)) {
    return new Response(
      `target has invalid ip: ${target.ip} (expected IPv4 or CIDR)`,
      { status: 500 },
    );
  }
  if (!isValidPort(target.port)) {
    return new Response(
      `target has invalid port: ${target.port} (expected 1..65535)`,
      { status: 500 },
    );
  }

  // Doppelte aktive Rule fuer dasselbe Target+User vermeiden
  const existing = await listRules(env);
  const prefix = env.RULE_TAG_PREFIX;
  const now = new Date();
  for (const r of existing) {
    const parsed = parseManagedDescription(r.description ?? "", prefix);
    if (
      parsed &&
      parsed.email === user.email &&
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
  const ruleName = `${prefix}-${target.id}-${user.email}`.slice(0, 100);

  let created;
  try {
    created = await createAllowRule(env, {
      name: ruleName,
      description: buildManagedDescription(prefix, user.email, expiresAt),
      precedence,
      email: user.email,
      ip: target.ip,
      port: target.port,
    });
  } catch (err) {
    await audit(env, {
      ts: new Date().toISOString(),
      event: "error",
      user: user.email,
      target_id: target.id,
      reason: (err as Error).message,
    });
    return new Response(`gateway api error: ${(err as Error).message}`, { status: 500 });
  }

  await audit(env, {
    ts: new Date().toISOString(),
    event: "request",
    user: user.email,
    target_id: target.id,
    rule_id: created.id,
    ttl_minutes: ttlMin,
    expires_at: expiresAt.toISOString(),
  });

  return Response.json({
    rule_id: created.id,
    target_id: target.id,
    granted_to: user.email,
    valid_until: expiresAt.toISOString(),
    ttl_minutes: ttlMin,
  });
}
