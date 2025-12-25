-- name: CreateRefreshToken :exec
INSERT INTO auth_refresh_tokens (
    refresh_token_id,
    user_uuid,
    token_hash,
    expires_at,
    created_ip,
    user_agent
) VALUES (?, ?, ?, ?, ?, ?);

-- name: GetActiveRefreshTokenByHash :one
SELECT
    refresh_token_id,
    user_uuid,
    token_hash,
    issued_at,
    expires_at,
    revoked_at,
    last_used_at,
    replaced_by_id,
    created_ip,
    user_agent
FROM auth_refresh_tokens
WHERE token_hash = ?
    AND revoked_at IS NULL
    AND expires_at > NOW();

-- name: GetRefreshTokenByID :one
SELECT
    refresh_token_id,
    user_uuid,
    token_hash,
    issued_at,
    expires_at,
    revoked_at,
    last_used_at,
    replaced_by_id,
    created_ip,
    user_agent
FROM auth_refresh_tokens
WHERE refresh_token_id = ?;

-- name: UpdateRefreshTokenLastUsed :exec
UPDATE auth_refresh_tokens
SET last_used_at = NOW()
WHERE refresh_token_id = ?;

-- name: RotateRefreshToken :exec
UPDATE auth_refresh_tokens
SET revoked_at = NOW(),
    replaced_by_id = ?,
    last_used_at = NOW()
WHERE refresh_token_id = ?
    AND revoked_at IS NULL;

-- name: RevokeRefreshToken :exec
UPDATE auth_refresh_tokens
SET revoked_at = NOW()
WHERE refresh_token_id = ?
    AND revoked_at IS NULL;

-- name: RevokeRefreshTokensForUser :exec
UPDATE auth_refresh_tokens
SET revoked_at = NOW()
WHERE user_uuid = ?
    AND revoked_at IS NULL;

-- name: DeleteExpiredRefreshTokens :exec
DELETE FROM auth_refresh_tokens
WHERE expires_at < NOW();
