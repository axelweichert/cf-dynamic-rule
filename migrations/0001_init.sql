-- cf-dynamic-rule v0.5.0 - Initial D1-Schema
--
-- Zwei Tabellen:
--   users            -- bekannte User (E-Mail-Adressen, die ein Admin freigeschaltet hat)
--   access_packages  -- vorbereitete Zugriffspakete: User x Target x Zeitfenster, vom Admin angelegt
--
-- Bewusste Entscheidungen:
--   - Targets bleiben in KV (TARGETS-Binding). Pakete referenzieren target_id als String.
--     KV bleibt schnell-Lookup beim Apply.
--   - Audit bleibt komplett in R2 (immutable JSONL pro Tag, lib/audit.ts unveraendert).

CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,             -- UUID v4
    email       TEXT NOT NULL UNIQUE,         -- Login-Email, case-insensitive vergleichen
    label       TEXT,                          -- optional, z. B. "Max Mustermann (Externer Berater)"
    created_at  TEXT NOT NULL,                -- ISO-8601
    created_by  TEXT NOT NULL,                -- Admin-Email
    disabled    INTEGER NOT NULL DEFAULT 0    -- 0/1, Soft-Delete
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS access_packages (
    id            TEXT PRIMARY KEY,            -- UUID v4
    user_id       TEXT NOT NULL,               -- FK -> users.id
    target_id     TEXT NOT NULL,               -- KV-Target-ID
    valid_from    TEXT NOT NULL,               -- ISO-8601, ab wann der User klicken darf
    valid_until   TEXT NOT NULL,               -- ISO-8601, bis wann der User klicken darf
    duration_min  INTEGER NOT NULL,            -- Dauer der Allow-Rule beim Klick (Minuten),
                                                -- ueberschreibt RULE_TTL_MINUTES wenn gesetzt
    note          TEXT,                         -- optional, Begruendung/Kontext
    -- Vier-Augen-Prinzip
    approved      INTEGER NOT NULL DEFAULT 0,  -- 0/1
    approved_by   TEXT,                         -- Admin-Email
    approved_at   TEXT,                         -- ISO-8601
    -- Audit
    created_at    TEXT NOT NULL,
    created_by    TEXT NOT NULL,
    -- Nutzung
    used_at       TEXT,                         -- ISO-8601, gesetzt beim ersten erfolgreichen Apply
    used_rule_id  TEXT,                         -- Gateway-Rule-ID (Referenz fuer Revoke)
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_packages_user ON access_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_packages_window ON access_packages(valid_from, valid_until);
