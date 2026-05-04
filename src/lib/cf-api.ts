// Cloudflare Gateway API Client
// Doku: https://developers.cloudflare.com/cloudflare-one/traffic-policies/network-policies/

import type { Env, GatewayRule } from "../types.js";

const API_BASE = "https://api.cloudflare.com/client/v4";

interface CfApiEnvelope<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: T;
}

async function cfFetch<T>(
  env: Env,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}/accounts/${env.CF_ACCOUNT_ID}${path}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${env.CF_API_TOKEN}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let json: CfApiEnvelope<T>;
  try {
    json = JSON.parse(text) as CfApiEnvelope<T>;
  } catch {
    throw new Error(`Cloudflare API non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok || !json.success) {
    const msg = json.errors?.map((e) => `${e.code}:${e.message}`).join("; ") ?? `HTTP ${res.status}`;
    throw new Error(`Cloudflare API error: ${msg}`);
  }
  return json.result;
}

export interface CreateRuleInput {
  name: string;
  description: string;
  precedence: number;
  email: string;
  ip: string;
  port: number;
}

/**
 * Erstellt eine Allow-Network-Rule fuer eine Email auf eine IP+Port-Kombination.
 * Filter-Layer: l4 (TCP/UDP).
 */
export async function createAllowRule(env: Env, input: CreateRuleInput): Promise<GatewayRule> {
  const body = {
    name: input.name,
    description: input.description,
    precedence: input.precedence,
    enabled: true,
    action: "allow",
    filters: ["l4"],
    traffic: `net.dst.ip == "${input.ip}" and net.dst.port == ${input.port}`,
    identity: `identity.email == "${input.email}"`,
    device_posture: "",
  };
  return cfFetch<GatewayRule>(env, "/gateway/rules", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listRules(env: Env): Promise<GatewayRule[]> {
  return cfFetch<GatewayRule[]>(env, "/gateway/rules", { method: "GET" });
}

export async function deleteRule(env: Env, ruleId: string): Promise<void> {
  await cfFetch<unknown>(env, `/gateway/rules/${ruleId}`, { method: "DELETE" });
}

/**
 * Parst die Description-Konvention "<prefix>|<email>|<expiry-iso>".
 * Gibt null zurueck, wenn die Description nicht unserem Format entspricht.
 */
export function parseManagedDescription(
  desc: string,
  prefix: string,
): { email: string; expiresAt: Date } | null {
  if (!desc.startsWith(`${prefix}|`)) return null;
  const parts = desc.split("|");
  if (parts.length < 3) return null;
  const email = parts[1];
  const expiresAt = new Date(parts[2]);
  if (Number.isNaN(expiresAt.getTime())) return null;
  return { email, expiresAt };
}

export function buildManagedDescription(
  prefix: string,
  email: string,
  expiresAt: Date,
): string {
  return `${prefix}|${email}|${expiresAt.toISOString()}`;
}
