// Admin-Endpoints fuer Access Packages (v0.5.0).
// Vier-Augen-Prinzip: createPackage setzt approved=false. Erst nach explizitem
// approve sieht der User das Paket -- das ist die zweite Schwelle.

import type { Env } from "../types.js";
import { requireUser } from "../lib/jwt.js";
import { isAdmin } from "../lib/admin.js";
import { getTarget } from "../lib/targets.js";
import {
  approvePackage,
  createPackage,
  deletePackage,
  getPackage,
  getUser,
  listPackages,
  revokeApproval,
} from "../lib/db.js";
import { audit } from "../lib/audit.js";

interface CreatePackageBody {
  user_id?: string;
  target_id?: string;
  valid_from?: string;
  valid_until?: string;
  duration_min?: number;
  note?: string | null;
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

function parseIsoStrict(s: string): Date | null {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function handleAdminListPackages(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;
  const packages = await listPackages(env);
  return Response.json({ packages });
}

export async function handleAdminCreatePackage(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;
  const adminEmail = auth.email;

  let body: CreatePackageBody;
  try {
    body = (await request.json()) as CreatePackageBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const userId = (body.user_id || "").trim();
  const targetId = (body.target_id || "").trim();
  const validFromStr = (body.valid_from || "").trim();
  const validUntilStr = (body.valid_until || "").trim();
  const durationMin = body.duration_min;
  const note =
    body.note === undefined ? null : (body.note || "").trim() || null;

  if (!userId) return new Response("user_id required", { status: 400 });
  const user = await getUser(env, userId);
  if (!user) return new Response("user not found", { status: 404 });
  if (user.disabled) {
    return new Response("user is disabled, cannot create package", { status: 409 });
  }

  if (!targetId) return new Response("target_id required", { status: 400 });
  const target = await getTarget(env, targetId);
  if (!target || target.disabled === true) {
    return new Response("target not found or disabled", { status: 404 });
  }

  const validFrom = parseIsoStrict(validFromStr);
  const validUntil = parseIsoStrict(validUntilStr);
  if (!validFrom) return new Response("valid_from invalid (ISO-8601)", { status: 400 });
  if (!validUntil) return new Response("valid_until invalid (ISO-8601)", { status: 400 });
  if (validUntil.getTime() <= validFrom.getTime()) {
    return new Response("valid_until must be after valid_from", { status: 400 });
  }

  if (
    typeof durationMin !== "number" ||
    !Number.isInteger(durationMin) ||
    durationMin < 1 ||
    durationMin > 1440
  ) {
    return new Response("duration_min invalid (1..1440 minutes)", { status: 400 });
  }

  if (note !== null && note.length > 500) {
    return new Response("note too long (max 500 chars)", { status: 400 });
  }

  const created = await createPackage(env, {
    user_id: userId,
    target_id: targetId,
    valid_from: validFrom.toISOString(),
    valid_until: validUntil.toISOString(),
    duration_min: durationMin,
    note,
    created_by: adminEmail,
  });

  await audit(env, {
    ts: new Date().toISOString(),
    event: "admin_package_create",
    user: adminEmail,
    target_id: targetId,
    details: {
      package_id: created.id,
      user_id: userId,
      user_email: user.email,
      valid_from: created.valid_from,
      valid_until: created.valid_until,
      duration_min: created.duration_min,
    },
  });

  return Response.json({ package: created }, { status: 201 });
}

export async function handleAdminApprovePackage(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;
  const adminEmail = auth.email;

  const existing = await getPackage(env, id);
  if (!existing) return new Response("package not found", { status: 404 });

  // Vier-Augen-Prinzip ist bevorzugt, aber Operations-Realitaet (Krankheit,
  // Urlaub, Notfall) erlaubt Selbst-Freischaltung. Im Audit-Log bleibt
  // approved_by/created_by sichtbar -- Selbst-Freischaltung ist also
  // jederzeit nachvollziehbar.

  if (existing.approved) {
    return Response.json({ package: existing, message: "already approved" });
  }

  const updated = await approvePackage(env, id, adminEmail);
  const selfApproved =
    existing.created_by.toLowerCase() === adminEmail.toLowerCase();

  await audit(env, {
    ts: new Date().toISOString(),
    event: "admin_package_approve",
    user: adminEmail,
    details: {
      package_id: id,
      approved_by: adminEmail,
      created_by: existing.created_by,
      self_approved: selfApproved,
    },
  });

  return Response.json({ package: updated });
}

export async function handleAdminRevokeApproval(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;
  const adminEmail = auth.email;

  const existing = await getPackage(env, id);
  if (!existing) return new Response("package not found", { status: 404 });
  if (!existing.approved) {
    return Response.json({ package: existing, message: "not approved" });
  }

  const updated = await revokeApproval(env, id);

  await audit(env, {
    ts: new Date().toISOString(),
    event: "admin_package_revoke_approval",
    user: adminEmail,
    details: { package_id: id },
  });

  return Response.json({ package: updated });
}

export async function handleAdminDeletePackage(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;
  const adminEmail = auth.email;

  const existing = await getPackage(env, id);
  if (!existing) return new Response("package not found", { status: 404 });

  await deletePackage(env, id);

  await audit(env, {
    ts: new Date().toISOString(),
    event: "admin_package_delete",
    user: adminEmail,
    details: {
      package_id: id,
      user_id: existing.user_id,
      target_id: existing.target_id,
      had_been_used: !!existing.used_at,
    },
  });

  return Response.json({ deleted: true });
}
