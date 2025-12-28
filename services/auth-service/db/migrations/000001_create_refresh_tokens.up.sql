CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    refresh_token_id BINARY(16) NOT NULL PRIMARY KEY,
    user_uuid BINARY(16) NOT NULL,
    token_hash BINARY(32) NOT NULL,
    issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    last_used_at DATETIME NULL,
    replaced_by_id BINARY(16) NULL,
    created_ip VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    UNIQUE KEY uk_refresh_token_hash (token_hash),
    KEY idx_refresh_tokens_user (user_uuid),
    KEY idx_refresh_tokens_expires (expires_at),
    KEY idx_refresh_tokens_revoked (revoked_at)
);
