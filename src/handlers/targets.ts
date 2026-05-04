// GET /api/targets - liefert verfuegbare Targets (Option A: keine Gruppen-Filter)

import type { Env } from "../types.js";
import { requireUser } from "../lib/jwt.js";
import { listTargets } from "../lib/targets.js";

export async function handleTargets(request: Request, env: Env): Promise<Response> {
  try {
    await requireUser(request, env);
  } catch (err) {
    return new Response(`Unauthorized: ${(err as Error).message}`, { status: 401 });
  }
  const targets = await listTargets(env);
  const slim = targets.map((t) => ({
    id: t.id,
    label: t.label,
    service: t.service,
    ip: t.ip,
    port: t.port,
    protocol: t.protocol,
  }));
  return Response.json({ targets: slim });
}
