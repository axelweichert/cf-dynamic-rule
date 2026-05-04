// Admin-Berechtigung + Validatoren.
// 0.4.1: strikte IP-Validierung (nur RFC1918, nur Einzel-IPs).

import type { Env } from "../types.js";

export function isAdmin(email: string, env: Env): boolean {
  const list = (env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/**
 * Parst eine IPv4-Adresse zu ihren 4 Oktetten oder gibt null zurueck.
 * Akzeptiert KEIN CIDR.
 */
function parseIpv4(s: string): [number, number, number, number] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  const c = parseInt(m[3], 10);
  const d = parseInt(m[4], 10);
  if (a > 255 || b > 255 || c > 255 || d > 255) return null;
  return [a, b, c, d];
}

/**
 * Pruefe, ob eine IP in einem RFC1918-Bereich liegt.
 *  10.0.0.0/8        => 10.x.x.x
 *  172.16.0.0/12     => 172.16.x.x .. 172.31.x.x
 *  192.168.0.0/16    => 192.168.x.x
 */
function isRfc1918(octets: [number, number, number, number]): boolean {
  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

/**
 * Validiert eine Target-IP nach den 0.4.1-Regeln:
 *  - Nur IPv4-Einzeladressen (KEIN CIDR)
 *  - Muss in RFC1918 liegen (10/8, 172.16/12, 192.168/16)
 *  - Keine Loopback/Multicast/Broadcast
 *
 * Gibt einen Fehlertext zurueck oder null wenn alles ok.
 * Bewusst als "validate" mit Fehlertext implementiert, damit das UI dem
 * Admin sagen kann, was genau falsch ist.
 */
export function validateTargetIp(s: string): string | null {
  const trimmed = (s || "").trim();
  if (!trimmed) return "ip required";
  if (trimmed.includes("/")) {
    return "CIDR-Notation nicht erlaubt - bitte einzelne Host-IP angeben";
  }
  const octets = parseIpv4(trimmed);
  if (!octets) {
    return `keine gueltige IPv4-Adresse: "${trimmed}"`;
  }
  if (!isRfc1918(octets)) {
    return `IP "${trimmed}" liegt nicht in einem RFC1918-Bereich (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)`;
  }
  return null;
}

/**
 * Convenience-Wrapper als Boolean-Variante. Wird in request.ts genutzt,
 * wo wir nur "ja/nein" brauchen, weil der KV-Inhalt zur Laufzeit
 * geprueft wird (nicht durch ein UI).
 */
export function isValidTargetIp(s: string): boolean {
  return validateTargetIp(s) === null;
}

/**
 * Validiert eine Target-ID. Erlaubt: a-z, 0-9, Bindestrich. 1..64 Zeichen.
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
