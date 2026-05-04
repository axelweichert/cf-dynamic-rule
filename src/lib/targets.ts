// Target-Whitelist aus KV lesen.
// Key-Konvention: targets:<id>

import type { Env, Target } from "../types.js";

const KEY_PREFIX = "targets:";

/**
 * Liefert ALLE Targets (auch disabled) - fuer Admin-View.
 */
export async function listAllTargets(env: Env): Promise<Target[]> {
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

/**
 * Liefert nur AKTIVE (nicht-disabled) Targets - fuer User-View / Pulldown.
 */
export async function listTargets(env: Env): Promise<Target[]> {
  const all = await listAllTargets(env);
  return all.filter((t) => t.disabled !== true);
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

/**
 * Schreibt ein Target nach KV. Ueberschreibt existierende Eintraege mit
 * gleicher ID. Aufrufer sind verantwortlich fuer Validierung.
 */
export async function putTarget(env: Env, target: Target): Promise<void> {
  await env.TARGETS.put(`${KEY_PREFIX}${target.id}`, JSON.stringify(target));
}

/**
 * Loescht ein Target HART aus KV. Aufrufer sollte vorher pruefen, ob
 * aktive Gateway-Rules dranhaengen (siehe Soft-Delete-Strategie).
 */
export async function hardDeleteTarget(env: Env, id: string): Promise<void> {
  await env.TARGETS.delete(`${KEY_PREFIX}${id}`);
}
