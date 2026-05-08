// GET /api/me - liefert die JWT-Email, Admin-Flag und die aktuell einloesbaren
// Zugriffspakete. Wird vom UI verwendet, um den User-Tab zu rendern und den
// Admin-Tab dynamisch ein-/auszublenden.

import type { Env, Target } from "../types.js";
import { requireUser } from "../lib/jwt.js";
import { isAdmin } from "../lib/admin.js";
import { listVisiblePackagesForEmail } from "../lib/db.js";
import { getTarget } from "../lib/targets.js";

export async function handleMe(request: Request, env: Env): Promise<Response> {
  let user;
  try {
    user = await requireUser(request, env);
  } catch (err) {
    return new Response(`Unauthorized: ${(err as Error).message}`, { status: 401 });
  }

  // Sichtbare Pakete fuer diesen User abrufen (approved=true klickbar,
  // approved=false als "wartet auf Freischaltung" sichtbar aber disabled).
  // Pro Paket das zugehoerige Target aus KV nachladen, damit das UI Label/IP/Port
  // direkt anzeigen kann ohne weitere Roundtrips.
  let packages: Array<{
    id: string;
    target_id: string;
    target: Target | null;
    valid_from: string;
    valid_until: string;
    duration_min: number;
    note: string | null;
    approved: boolean;
    approved_by: string | null;
    created_by: string;
  }> = [];
  try {
    const raw = await listVisiblePackagesForEmail(env, user.email);
    packages = await Promise.all(
      raw.map(async (p) => ({
        id: p.id,
        target_id: p.target_id,
        target: await getTarget(env, p.target_id),
        valid_from: p.valid_from,
        valid_until: p.valid_until,
        duration_min: p.duration_min,
        note: p.note ?? null,
        approved: p.approved,
        approved_by: p.approved_by ?? null,
        created_by: p.created_by,
      })),
    );
    // Pakete deren Target geloescht/disabled wurde rausfiltern -- nicht klickbar.
    packages = packages.filter((p) => p.target !== null && p.target.disabled !== true);
  } catch (err) {
    // D1-Failure soll /api/me nicht killen. Ohne Pakete weiter.
    console.error("me_packages_failed", err);
  }

  return Response.json({
    email: user.email,
    is_admin: isAdmin(user.email, env),
    packages,
  });
}
