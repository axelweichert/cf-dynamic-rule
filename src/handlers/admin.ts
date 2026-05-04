// Admin-Endpoints fuer Target-Verwaltung.
// Authorization: env.ADMIN_EMAILS (CSV) muss die JWT-Email enthalten.

import type { Env, Target } from "../types.js";
import { requireUser } from "../lib/jwt.js";
import {
  isAdmin,
  isValidIpv4OrCidr,
  isValidPort,
  isValidTargetId,
} from "../lib/admin.js";
import {
  getTarget,
  hardDeleteTarget,
  listAllTargets,
  putTarget,
} from "../lib/targets.js";
import { audit } from "../lib/audit.js";

interface CreateBody {
  id?: string;
  label?: string;
  ip?: string;
  port?: number;
  protocol?: "tcp" | "udp";
  service?: string;
}

interface UpdateBody {
  label?: string;
  ip?: string;
  port?: number;
  protocol?: "tcp" | "udp";
  service?: string;
  disabled?: boolean;
}

async function requireAdmin(
  request: Request,
  env: Env,
): Promise<{ email: string } | Response> {
  let user;
  try {
    user = await requireUser(request, env);
  } catch (err) {
    return new Response(`Unauthorized: ${(err as Error).message}`, { status: 401 });
  }
  if (!isAdmin(user.email, env)) {
    return new Response("Forbidden: admin only", { status: 403 });
  }
  return { email: user.email };
}

/**
 * GET /api/admin/targets - alle Targets (auch disabled).
 */
export async function handleAdminListTargets(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;

  const targets = await listAllTargets(env);
  // Sortiere fuer stabile Anzeige: aktive zuerst, dann nach label
  targets.sort((a, b) => {
    if ((a.disabled === true) !== (b.disabled === true)) {
      return a.disabled === true ? 1 : -1;
    }
    return (a.label || a.id).localeCompare(b.label || b.id);
  });
  return Response.json({ targets });
}

/**
 * POST /api/admin/targets - neues Target anlegen.
 */
export async function handleAdminCreateTarget(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;
  const adminEmail = auth.email;

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const id = (body.id || "").trim();
  const label = (body.label || "").trim();
  const ip = (body.ip || "").trim();
  const port = body.port;
  const protocol = body.protocol;
  const service = (body.service || "").trim();

  // Validierung
  if (!isValidTargetId(id)) {
    return new Response(
      `id invalid: must match [a-z0-9-]{1,64}, got "${id}"`,
      { status: 400 },
    );
  }
  if (!label || label.length > 100) {
    return new Response("label required (1..100 chars)", { status: 400 });
  }
  if (!isValidIpv4OrCidr(ip)) {
    return new Response(`ip invalid: expected IPv4 or CIDR, got "${ip}"`, {
      status: 400,
    });
  }
  if (!isValidPort(port)) {
    return new Response("port invalid: expected integer 1..65535", {
      status: 400,
    });
  }
  if (protocol !== "tcp" && protocol !== "udp") {
    return new Response('protocol invalid: expected "tcp" or "udp"', {
      status: 400,
    });
  }
  if (!service || service.length > 50) {
    return new Response("service required (1..50 chars)", { status: 400 });
  }

  // Konflikt: Target mit dieser ID existiert bereits
  const existing = await getTarget(env, id);
  if (existing) {
    return new Response(`target with id "${id}" already exists`, { status: 409 });
  }

  const now = new Date().toISOString();
  const target: Target = {
    id,
    label,
    ip,
    port: port as number,
    protocol,
    service,
    disabled: false,
    created_by: adminEmail,
    created_at: now,
    updated_by: adminEmail,
    updated_at: now,
  };

  await putTarget(env, target);

  await audit(env, {
    ts: now,
    event: "admin_create",
    user: adminEmail,
    target_id: id,
    details: { label, ip, port: port as number, protocol, service },
  });

  return Response.json({ target }, { status: 201 });
}

/**
 * PUT /api/admin/targets/:id - bestehendes Target aendern.
 * Erlaubt: label, ip, port, protocol, service, disabled.
 * id selbst ist immutable (Key-Konvention).
 */
export async function handleAdminUpdateTarget(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;
  const adminEmail = auth.email;

  if (!isValidTargetId(id)) {
    return new Response("invalid id in url", { status: 400 });
  }

  const existing = await getTarget(env, id);
  if (!existing) return new Response("target not found", { status: 404 });

  let body: UpdateBody;
  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const updated: Target = { ...existing };
  const changes: Record<string, unknown> = {};

  if (body.label !== undefined) {
    const v = String(body.label).trim();
    if (!v || v.length > 100) {
      return new Response("label invalid (1..100 chars)", { status: 400 });
    }
    if (v !== existing.label) {
      updated.label = v;
      changes.label = { from: existing.label, to: v };
    }
  }
  if (body.ip !== undefined) {
    const v = String(body.ip).trim();
    if (!isValidIpv4OrCidr(v)) {
      return new Response(`ip invalid: ${v}`, { status: 400 });
    }
    if (v !== existing.ip) {
      updated.ip = v;
      changes.ip = { from: existing.ip, to: v };
    }
  }
  if (body.port !== undefined) {
    if (!isValidPort(body.port)) {
      return new Response("port invalid (1..65535)", { status: 400 });
    }
    if (body.port !== existing.port) {
      updated.port = body.port;
      changes.port = { from: existing.port, to: body.port };
    }
  }
  if (body.protocol !== undefined) {
    if (body.protocol !== "tcp" && body.protocol !== "udp") {
      return new Response('protocol invalid: "tcp" or "udp"', { status: 400 });
    }
    if (body.protocol !== existing.protocol) {
      updated.protocol = body.protocol;
      changes.protocol = { from: existing.protocol, to: body.protocol };
    }
  }
  if (body.service !== undefined) {
    const v = String(body.service).trim();
    if (!v || v.length > 50) {
      return new Response("service invalid (1..50 chars)", { status: 400 });
    }
    if (v !== existing.service) {
      updated.service = v;
      changes.service = { from: existing.service, to: v };
    }
  }
  if (body.disabled !== undefined) {
    const v = !!body.disabled;
    if (v !== (existing.disabled === true)) {
      updated.disabled = v;
      changes.disabled = { from: existing.disabled === true, to: v };
    }
  }

  if (Object.keys(changes).length === 0) {
    return Response.json({ target: existing, message: "no changes" });
  }

  const now = new Date().toISOString();
  updated.updated_by = adminEmail;
  updated.updated_at = now;

  await putTarget(env, updated);

  await audit(env, {
    ts: now,
    event: "admin_update",
    user: adminEmail,
    target_id: id,
    details: { changes },
  });

  return Response.json({ target: updated });
}

/**
 * DELETE /api/admin/targets/:id - Soft-Delete (setzt disabled=true).
 * Hard-Delete ist nicht ueber die UI verfuegbar; aktive Gateway-Rules
 * laufen ueber TTL ab oder werden ueber den User-Revoke-Pfad beendet.
 */
export async function handleAdminDeleteTarget(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;
  const adminEmail = auth.email;

  if (!isValidTargetId(id)) {
    return new Response("invalid id in url", { status: 400 });
  }

  const existing = await getTarget(env, id);
  if (!existing) return new Response("target not found", { status: 404 });

  if (existing.disabled === true) {
    return new Response("target already disabled", { status: 409 });
  }

  const now = new Date().toISOString();
  const updated: Target = {
    ...existing,
    disabled: true,
    updated_by: adminEmail,
    updated_at: now,
  };
  await putTarget(env, updated);

  await audit(env, {
    ts: now,
    event: "admin_delete",
    user: adminEmail,
    target_id: id,
    details: { soft_delete: true, label: existing.label, ip: existing.ip, port: existing.port },
  });

  return Response.json({ target: updated, soft_deleted: true });
}

// hardDeleteTarget bleibt ungenutzt im aktuellen API-Surface,
// ist aber im targets-Lib verfuegbar fuer kuenftige Bereinigungs-Tools.
void hardDeleteTarget;
