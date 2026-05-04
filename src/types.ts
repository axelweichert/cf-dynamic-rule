// Geteilte Typen fuer cf-dynamic-rule

export interface Env {
  TARGETS: KVNamespace;
  AUDIT: R2Bucket;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
  ACCESS_AUD: string;
  ACCESS_TEAM_DOMAIN: string;
  RULE_TTL_MINUTES: string;
  RULE_TAG_PREFIX: string;
  RULE_PRECEDENCE: string;
  ADMIN_EMAILS: string;
}

export interface Target {
  id: string;
  label: string;
  ip: string;
  port: number;
  protocol: "tcp" | "udp";
  service: string;
  // Gruppen-Whitelist - in v0.2.0 nicht ausgewertet (Option A)
  allowed_groups?: string[];
  // 0.4.0: Soft-Delete-Flag. Disabled Targets erscheinen nicht im User-Pulldown.
  disabled?: boolean;
  // 0.4.0: Audit-Felder fuer Target-Verwaltung
  created_by?: string;
  created_at?: string;
  updated_by?: string;
  updated_at?: string;
}

export interface AccessJwtPayload {
  email: string;
  sub: string;
  aud: string | string[];
  iss: string;
  exp: number;
  iat: number;
  // Optional - je nach IdP-Config
  identity_nonce?: string;
  custom?: Record<string, unknown>;
  groups?: string[];
}

export interface GatewayRule {
  id: string;
  name: string;
  description: string;
  precedence: number;
  enabled: boolean;
  action: string;
  filters: string[];
  traffic: string;
  identity: string;
  device_posture: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateRuleResult {
  rule_id: string;
  target_id: string;
  granted_to: string;
  valid_until: string;
  ttl_minutes: number;
}

export interface AuditEvent {
  ts: string;
  event:
    | "request"
    | "cleanup"
    | "manual_revoke"
    | "error"
    | "admin_create"
    | "admin_update"
    | "admin_delete";
  user?: string;
  target_id?: string;
  rule_id?: string;
  ttl_minutes?: number;
  expires_at?: string;
  reason?: string;
  details?: Record<string, unknown>;
}
