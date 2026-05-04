// Audit-Logger - schreibt JSONL nach R2.
// Pro Tag eine Datei: audit/YYYY-MM-DD.jsonl
// Append via Read-Modify-Write. Demo-tauglich, nicht hochlast-fest.

import type { AuditEvent, Env } from "../types.js";

function dayKey(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `audit/${y}-${m}-${day}.jsonl`;
}

export async function audit(env: Env, ev: AuditEvent): Promise<void> {
  const enriched: AuditEvent = { ...ev, ts: new Date().toISOString() };
  const line = JSON.stringify(enriched) + "\n";
  const key = dayKey();
  try {
    const existing = await env.AUDIT.get(key);
    let existingText = "";
    if (existing) existingText = await existing.text();
    await env.AUDIT.put(key, existingText + line, {
      httpMetadata: { contentType: "application/x-ndjson" },
    });
  } catch (err) {
    // Audit-Failure darf den Hauptpfad nicht kippen.
    console.error("audit_failure", err);
  }
}
