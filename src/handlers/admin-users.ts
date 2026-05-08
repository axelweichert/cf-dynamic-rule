// Admin-Endpoints fuer User-Verwaltung (v0.5.0).
// Authorization: env.ADMIN_EMAILS (CSV) muss die JWT-Email enthalten.

import type { Env } from "../types.js";
import { requireUser } from "../lib/jwt.js";
import { isAdmin } from "../lib/admin.js";
import {
  createUser,
  getUser,
  getUserByEmail,
  listUsers,
  updateUser,
} from "../lib/db.js";
import { audit } from "../lib/audit.js";

interface CreateUserBody {
  email?: string;
  label?: string | null;
}

interface UpdateUserBody {
  label?: string | null;
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handleAdminListUsers(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;
  const users = await listUsers(env);
  return Response.json({ users });
}

export async function handleAdminCreateUser(
  request: Request,
  env: Env,
): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;
  const adminEmail = auth.email;

  let body: CreateUserBody;
  try {
    body = (await request.json()) as CreateUserBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const email = (body.email || "").trim();
  const label = body.label === undefined ? null : (body.label || "").trim() || null;

  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return new Response("email invalid", { status: 400 });
  }
  if (label !== null && label.length > 100) {
    return new Response("label invalid (max 100 chars)", { status: 400 });
  }

  const existing = await getUserByEmail(env, email);
  if (existing) {
    return new Response(`user with email "${email}" already exists`, { status: 409 });
  }

  const created = await createUser(env, { email, label, created_by: adminEmail });

  await audit(env, {
    ts: new Date().toISOString(),
    event: "admin_user_create",
    user: adminEmail,
    details: { user_id: created.id, email, label },
  });

  return Response.json({ user: created }, { status: 201 });
}

export async function handleAdminUpdateUser(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;
  const adminEmail = auth.email;

  const existing = await getUser(env, id);
  if (!existing) return new Response("user not found", { status: 404 });

  let body: UpdateUserBody;
  try {
    body = (await request.json()) as UpdateUserBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const patch: { label?: string | null; disabled?: boolean } = {};
  const changes: Record<string, unknown> = {};

  if (body.label !== undefined) {
    const v = body.label === null ? null : String(body.label).trim() || null;
    if (v !== null && v.length > 100) {
      return new Response("label invalid (max 100 chars)", { status: 400 });
    }
    if (v !== existing.label) {
      patch.label = v;
      changes.label = { from: existing.label, to: v };
    }
  }
  if (body.disabled !== undefined) {
    const v = !!body.disabled;
    if (v !== existing.disabled) {
      patch.disabled = v;
      changes.disabled = { from: existing.disabled, to: v };
    }
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ user: existing, message: "no changes" });
  }

  const updated = await updateUser(env, id, patch);

  await audit(env, {
    ts: new Date().toISOString(),
    event: "admin_user_update",
    user: adminEmail,
    details: { user_id: id, changes },
  });

  return Response.json({ user: updated });
}

export async function handleAdminDeleteUser(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  // Soft-Delete via disabled = true. Konsistent mit Targets-Verhalten.
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;
  const adminEmail = auth.email;

  const existing = await getUser(env, id);
  if (!existing) return new Response("user not found", { status: 404 });
  if (existing.disabled) {
    return new Response("user already disabled", { status: 409 });
  }

  const updated = await updateUser(env, id, { disabled: true });

  await audit(env, {
    ts: new Date().toISOString(),
    event: "admin_user_delete",
    user: adminEmail,
    details: { user_id: id, email: existing.email, soft_delete: true },
  });

  return Response.json({ user: updated, soft_deleted: true });
}
