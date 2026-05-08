// D1-Helper fuer User- und Paket-Verwaltung (v0.5.0).
//
// Datenbank-Schema: siehe migrations/0001_init.sql.
// Audit bleibt in R2 (lib/audit.ts), D1 haelt nur die strukturierten Daten.

import type { AccessPackage, Env, User } from "../types.js";

// ---------- users ---------------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  label: string | null;
  created_at: string;
  created_by: string;
  disabled: number;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    label: row.label,
    created_at: row.created_at,
    created_by: row.created_by,
    disabled: row.disabled === 1,
  };
}

export async function listUsers(env: Env): Promise<User[]> {
  const res = await env.DB.prepare(
    `SELECT id, email, label, created_at, created_by, disabled
     FROM users
     ORDER BY disabled ASC, email ASC`,
  ).all<UserRow>();
  return (res.results ?? []).map(mapUser);
}

export async function getUser(env: Env, id: string): Promise<User | null> {
  const row = await env.DB.prepare(
    `SELECT id, email, label, created_at, created_by, disabled FROM users WHERE id = ?`,
  )
    .bind(id)
    .first<UserRow>();
  return row ? mapUser(row) : null;
}

export async function getUserByEmail(env: Env, email: string): Promise<User | null> {
  // Email-Vergleich case-insensitive (Schema speichert Original-Schreibweise).
  const row = await env.DB.prepare(
    `SELECT id, email, label, created_at, created_by, disabled
     FROM users
     WHERE LOWER(email) = LOWER(?)`,
  )
    .bind(email)
    .first<UserRow>();
  return row ? mapUser(row) : null;
}

export async function createUser(
  env: Env,
  data: { email: string; label?: string | null; created_by: string },
): Promise<User> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (id, email, label, created_at, created_by, disabled)
     VALUES (?, ?, ?, ?, ?, 0)`,
  )
    .bind(id, data.email, data.label ?? null, now, data.created_by)
    .run();
  return {
    id,
    email: data.email,
    label: data.label ?? null,
    created_at: now,
    created_by: data.created_by,
    disabled: false,
  };
}

export async function updateUser(
  env: Env,
  id: string,
  patch: { label?: string | null; disabled?: boolean },
): Promise<User | null> {
  const existing = await getUser(env, id);
  if (!existing) return null;
  const label = patch.label !== undefined ? patch.label : existing.label;
  const disabled =
    patch.disabled !== undefined ? (patch.disabled ? 1 : 0) : existing.disabled ? 1 : 0;
  await env.DB.prepare(
    `UPDATE users SET label = ?, disabled = ? WHERE id = ?`,
  )
    .bind(label, disabled, id)
    .run();
  return getUser(env, id);
}

// ---------- access_packages ----------------------------------------------

interface PackageRow {
  id: string;
  user_id: string;
  target_id: string;
  valid_from: string;
  valid_until: string;
  duration_min: number;
  note: string | null;
  approved: number;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  created_by: string;
  used_at: string | null;
  used_rule_id: string | null;
}

function mapPackage(row: PackageRow): AccessPackage {
  return {
    id: row.id,
    user_id: row.user_id,
    target_id: row.target_id,
    valid_from: row.valid_from,
    valid_until: row.valid_until,
    duration_min: row.duration_min,
    note: row.note,
    approved: row.approved === 1,
    approved_by: row.approved_by,
    approved_at: row.approved_at,
    created_at: row.created_at,
    created_by: row.created_by,
    used_at: row.used_at,
    used_rule_id: row.used_rule_id,
  };
}

export async function listPackages(env: Env): Promise<AccessPackage[]> {
  const res = await env.DB.prepare(
    `SELECT * FROM access_packages ORDER BY created_at DESC`,
  ).all<PackageRow>();
  return (res.results ?? []).map(mapPackage);
}

export async function listPackagesForUser(
  env: Env,
  userId: string,
): Promise<AccessPackage[]> {
  const res = await env.DB.prepare(
    `SELECT * FROM access_packages WHERE user_id = ? ORDER BY valid_from ASC`,
  )
    .bind(userId)
    .all<PackageRow>();
  return (res.results ?? []).map(mapPackage);
}

/**
 * Pakete, die der User mit dieser E-Mail aktuell SEHEN soll
 * (Self-Service-Tab im UI):
 *   - User existiert und ist nicht disabled
 *   - jetzt zwischen valid_from und valid_until
 *   - noch nicht genutzt (used_at IS NULL)
 *   - approved kann true ODER false sein -- nicht-approved werden im UI
 *     mit Status "wartet auf Freischaltung" angezeigt, Button disabled.
 *
 * Email-Match case-insensitive.
 */
export async function listVisiblePackagesForEmail(
  env: Env,
  email: string,
): Promise<AccessPackage[]> {
  const nowIso = new Date().toISOString();
  const res = await env.DB.prepare(
    `SELECT p.*
     FROM access_packages p
     INNER JOIN users u ON u.id = p.user_id
     WHERE LOWER(u.email) = LOWER(?)
       AND u.disabled = 0
       AND p.valid_from <= ?
       AND p.valid_until >= ?
       AND p.used_at IS NULL
     ORDER BY p.approved DESC, p.valid_until ASC`,
  )
    .bind(email, nowIso, nowIso)
    .all<PackageRow>();
  return (res.results ?? []).map(mapPackage);
}

export async function getPackage(env: Env, id: string): Promise<AccessPackage | null> {
  const row = await env.DB.prepare(
    `SELECT * FROM access_packages WHERE id = ?`,
  )
    .bind(id)
    .first<PackageRow>();
  return row ? mapPackage(row) : null;
}

export async function createPackage(
  env: Env,
  data: {
    user_id: string;
    target_id: string;
    valid_from: string;
    valid_until: string;
    duration_min: number;
    note?: string | null;
    created_by: string;
  },
): Promise<AccessPackage> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO access_packages
       (id, user_id, target_id, valid_from, valid_until, duration_min,
        note, approved, created_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  )
    .bind(
      id,
      data.user_id,
      data.target_id,
      data.valid_from,
      data.valid_until,
      data.duration_min,
      data.note ?? null,
      now,
      data.created_by,
    )
    .run();
  const created = await getPackage(env, id);
  if (!created) throw new Error("createPackage: insert ok aber select leer");
  return created;
}

export async function approvePackage(
  env: Env,
  id: string,
  adminEmail: string,
): Promise<AccessPackage | null> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE access_packages
     SET approved = 1, approved_by = ?, approved_at = ?
     WHERE id = ?`,
  )
    .bind(adminEmail, now, id)
    .run();
  return getPackage(env, id);
}

export async function revokeApproval(
  env: Env,
  id: string,
): Promise<AccessPackage | null> {
  await env.DB.prepare(
    `UPDATE access_packages
     SET approved = 0, approved_by = NULL, approved_at = NULL
     WHERE id = ?`,
  )
    .bind(id)
    .run();
  return getPackage(env, id);
}

export async function deletePackage(env: Env, id: string): Promise<boolean> {
  const res = await env.DB.prepare(`DELETE FROM access_packages WHERE id = ?`)
    .bind(id)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function markPackageUsed(
  env: Env,
  id: string,
  ruleId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE access_packages SET used_at = ?, used_rule_id = ? WHERE id = ?`,
  )
    .bind(now, ruleId, id)
    .run();
}
