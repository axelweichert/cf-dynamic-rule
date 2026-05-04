// Cron-Cleanup: loescht abgelaufene Managed-Rules.

import type { Env } from "../types.js";
import { audit } from "../lib/audit.js";
import { deleteRule, listRules, parseManagedDescription } from "../lib/cf-api.js";

export async function runCleanup(env: Env): Promise<{ deleted: number; checked: number }> {
  const all = await listRules(env);
  const prefix = env.RULE_TAG_PREFIX;
  const now = new Date();
  let deleted = 0;
  let checked = 0;

  for (const r of all) {
    const parsed = parseManagedDescription(r.description ?? "", prefix);
    if (!parsed) continue;
    checked++;
    if (parsed.expiresAt > now) continue;
    try {
      await deleteRule(env, r.id);
      deleted++;
      await audit(env, {
        ts: new Date().toISOString(),
        event: "cleanup",
        user: parsed.email,
        rule_id: r.id,
        expires_at: parsed.expiresAt.toISOString(),
      });
    } catch (err) {
      await audit(env, {
        ts: new Date().toISOString(),
        event: "error",
        rule_id: r.id,
        reason: `cleanup_delete_failed: ${(err as Error).message}`,
      });
    }
  }

  return { deleted, checked };
}
