// Target-Whitelist aus KV lesen.
// Key-Konvention: targets:<id>

import type { Env, Target } from "../types.js";

const KEY_PREFIX = "targets:";

export async function listTargets(env: Env): Promise<Target[]> {
  const out: Target[] = [];
  let cursor: string | undefined;
  // KV list paginiert; fuer NFR-Demo genuegt eine Iteration, hier robust.
  do {
    const page = await env.TARGETS.list({ prefix: KEY_PREFIX, cursor });
    for (const k of page.keys) {
      const raw = await env.TARGETS.get(k.name);
      if (!raw) continue;
      try {
        out.push(JSON.parse(raw) as Target);
      } catch {
        // defekten Eintrag ignorieren
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out;
}

export async function getTarget(env: Env, id: string): Promise<Target | null> {
  const raw = await env.TARGETS.get(`${KEY_PREFIX}${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Target;
  } catch {
    return null;
  }
}
