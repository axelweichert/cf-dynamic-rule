// GET /api/me - liefert die JWT-Email und Admin-Flag.
// Wird vom UI verwendet, um den Admin-Tab dynamisch ein-/auszublenden.

import type { Env } from "../types.js";
import { requireUser } from "../lib/jwt.js";
import { isAdmin } from "../lib/admin.js";

export async function handleMe(request: Request, env: Env): Promise<Response> {
  let user;
  try {
    user = await requireUser(request, env);
  } catch (err) {
    return new Response(`Unauthorized: ${(err as Error).message}`, { status: 401 });
  }
  return Response.json({
    email: user.email,
    is_admin: isAdmin(user.email, env),
  });
}
