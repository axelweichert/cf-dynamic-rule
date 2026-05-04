// Admin-Berechtigung. Liest CSV-Liste aus env.ADMIN_EMAILS und prueft,
// ob die JWT-Email darunter ist.

import type { Env } from "../types.js";

export function isAdmin(email: string, env: Env): boolean {
  const list = (env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/**
 * Validiert eine IPv4-Adresse oder ein IPv4-CIDR (z.B. 10.0.0.0/8).
 * Gateway-Filter akzeptiert in `net.dst.ip in {...}` keine Hostnames und keine IPv6.
 * Spiegelt die Logik aus handlers/request.ts, wird aber auch fuer Admin-Validierung
 * benoetigt - hier zentral, damit beide Stellen konsistent sind.
 */
export function isValidIpv4OrCidr(s: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/.exec(s);
  if (!m) return false;
  for (let i = 1; i <= 4; i++) {
    const oct = parseInt(m[i], 10);
    if (oct < 0 || oct > 255) return false;
  }
  if (m[5] !== undefined) {
    const prefix = parseInt(m[5], 10);
    if (prefix < 0 || prefix > 32) return false;
  }
  return true;
}

/**
 * Validiert eine Target-ID. Erlaubt: a-z, 0-9, Bindestrich. Max 64 Zeichen,
 * mind 1 Zeichen. Keine Leerzeichen, keine Slashes (KV-Key-Konvention).
 */
export function isValidTargetId(s: string): boolean {
  return /^[a-z0-9-]{1,64}$/.test(s);
}

/**
 * Validiert einen TCP/UDP-Port als Integer 1..65535.
 */
export function isValidPort(p: unknown): p is number {
  return typeof p === "number" && Number.isInteger(p) && p >= 1 && p <= 65535;
}
