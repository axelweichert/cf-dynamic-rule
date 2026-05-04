// JWT-Verifikation fuer Cloudflare Access
// Doku: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/

import type { AccessJwtPayload, Env } from "../types.js";

interface JWK {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  e: string;
  n: string;
}

interface JWKSet {
  keys: JWK[];
}

// Cache fuer JWKs (Public Keys von Access).
// Cloudflare rotiert Keys regelmaessig; 1h Cache ist ueblich.
let jwksCache: { fetched: number; keys: JWK[] } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000;

async function getJwks(teamDomain: string): Promise<JWK[]> {
  if (jwksCache && Date.now() - jwksCache.fetched < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const url = `https://${teamDomain}/cdn-cgi/access/certs`;
  const res = await fetch(url, { cf: { cacheTtl: 300 } as RequestInitCfProperties });
  if (!res.ok) {
    throw new Error(`JWKS fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as JWKSet;
  jwksCache = { fetched: Date.now(), keys: data.keys };
  return data.keys;
}

function base64UrlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function decodeJson(part: string): Record<string, unknown> {
  const bytes = base64UrlDecode(part);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text) as Record<string, unknown>;
}

async function importJwk(jwk: JWK): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk as unknown as JsonWebKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

/**
 * Verifiziert ein Cloudflare-Access-JWT.
 * Erwartet:
 *  - Signatur gegen einen Public Key aus /cdn-cgi/access/certs
 *  - aud enthaelt die Application-AUD
 *  - iss == https://<team>.cloudflareaccess.com
 *  - exp in der Zukunft
 * Gibt das verifizierte Payload zurueck oder wirft.
 */
export async function verifyAccessJwt(token: string, env: Env): Promise<AccessJwtPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed JWT");

  const [headerPart, payloadPart, signaturePart] = parts;
  const header = decodeJson(headerPart) as { kid?: string; alg?: string };
  const payload = decodeJson(payloadPart) as unknown as AccessJwtPayload;

  if (header.alg !== "RS256") throw new Error(`unexpected alg: ${header.alg}`);
  if (!header.kid) throw new Error("missing kid");

  const keys = await getJwks(env.ACCESS_TEAM_DOMAIN);
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error(`unknown kid: ${header.kid}`);

  const cryptoKey = await importJwk(jwk);
  const signature = base64UrlDecode(signaturePart);
  const data = new TextEncoder().encode(`${headerPart}.${payloadPart}`);

  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    signature,
    data,
  );
  if (!valid) throw new Error("signature invalid");

  // Claim-Pruefungen
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) {
    throw new Error("token expired");
  }
  const expectedIss = `https://${env.ACCESS_TEAM_DOMAIN}`;
  if (payload.iss !== expectedIss) {
    throw new Error(`iss mismatch: ${payload.iss}`);
  }
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.includes(env.ACCESS_AUD)) {
    throw new Error("aud mismatch");
  }
  if (typeof payload.email !== "string" || !payload.email.includes("@")) {
    throw new Error("missing email claim");
  }

  return payload;
}

/**
 * Liest und verifiziert das Access-JWT aus dem Request.
 * Header-Quelle: Cf-Access-Jwt-Assertion (von Cloudflare Access gesetzt).
 * Fallback: Cookie CF_Authorization.
 */
export async function requireUser(request: Request, env: Env): Promise<AccessJwtPayload> {
  const headerToken = request.headers.get("Cf-Access-Jwt-Assertion");
  let token = headerToken ?? "";
  if (!token) {
    const cookie = request.headers.get("Cookie") ?? "";
    const match = cookie.match(/CF_Authorization=([^;]+)/);
    if (match) token = match[1];
  }
  if (!token) throw new Error("no Access JWT present");
  return verifyAccessJwt(token, env);
}
