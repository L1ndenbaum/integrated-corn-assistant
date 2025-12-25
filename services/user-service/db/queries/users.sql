-- name: CreateUser :execresult
INSERT INTO users (
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_balance,
    user_status,
    avatar_path,
    mfa_enabled
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: GetUserByID :one
SELECT
    user_id,
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_balance,
    user_status,
    avatar_path,
    mfa_enabled,
    created_at,
    updated_at,
    deleted_at,
    last_login_at,
    last_login_ip,
    password_updated_at,
    failed_login_attempts,
    locked_until
FROM users
WHERE user_id = ?;

-- name: GetUserByUUID :one
SELECT
    user_id,
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_balance,
    user_status,
    avatar_path,
    mfa_enabled,
    created_at,
    updated_at,
    deleted_at,
    last_login_at,
    last_login_ip,
    password_updated_at,
    failed_login_attempts,
    locked_until
FROM users
WHERE user_uuid = ?;

-- name: GetActiveUserByUUID :one
SELECT
    user_id,
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_balance,
    user_status,
    avatar_path,
    mfa_enabled,
    created_at,
    updated_at,
    deleted_at,
    last_login_at,
    last_login_ip,
    password_updated_at,
    failed_login_attempts,
    locked_until
FROM users
WHERE user_uuid = ?
    AND user_status = 1;

-- name: GetUserByUsername :one
SELECT
    user_id,
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_balance,
    user_status,
    avatar_path,
    mfa_enabled,
    created_at,
    updated_at,
    deleted_at,
    last_login_at,
    last_login_ip,
    password_updated_at,
    failed_login_attempts,
    locked_until
FROM users
WHERE username = ?;

-- name: GetActiveUserByUsername :one
SELECT
    user_id,
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_balance,
    user_status,
    avatar_path,
    mfa_enabled,
    created_at,
    updated_at,
    deleted_at,
    last_login_at,
    last_login_ip,
    password_updated_at,
    failed_login_attempts,
    locked_until
FROM users
WHERE username = ?
    AND user_status = 1;

-- name: GetUserByEmail :one
SELECT
    user_id,
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_balance,
    user_status,
    avatar_path,
    mfa_enabled,
    created_at,
    updated_at,
    deleted_at,
    last_login_at,
    last_login_ip,
    password_updated_at,
    failed_login_attempts,
    locked_until
FROM users
WHERE email = ?;

-- name: GetActiveUserByEmail :one
SELECT
    user_id,
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_balance,
    user_status,
    avatar_path,
    mfa_enabled,
    created_at,
    updated_at,
    deleted_at,
    last_login_at,
    last_login_ip,
    password_updated_at,
    failed_login_attempts,
    locked_until
FROM users
WHERE email = ?
    AND user_status = 1;

-- name: GetUserByPhone :one
SELECT
    user_id,
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_balance,
    user_status,
    avatar_path,
    mfa_enabled,
    created_at,
    updated_at,
    deleted_at,
    last_login_at,
    last_login_ip,
    password_updated_at,
    failed_login_attempts,
    locked_until
FROM users
WHERE phone = ?;

-- name: GetActiveUserByPhone :one
SELECT
    user_id,
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_balance,
    user_status,
    avatar_path,
    mfa_enabled,
    created_at,
    updated_at,
    deleted_at,
    last_login_at,
    last_login_ip,
    password_updated_at,
    failed_login_attempts,
    locked_until
FROM users
WHERE phone = ?
    AND user_status = 1;

-- name: GetActiveUserByLoginIdentifier :one
SELECT
    user_id,
    user_uuid,
    username,
    email,
    phone,
    password_hash,
    user_privilege,
    user_balance,
    user_status,
    avatar_path,
    mfa_enabled,
    created_at,
    updated_at,
    deleted_at,
    last_login_at,
    last_login_ip,
    password_updated_at,
    failed_login_attempts,
    locked_until
FROM users
WHERE user_status = 1
    AND (username = ? OR email = ? OR phone = ?);

-- name: UpdateUsername :exec
UPDATE users
SET username = ?
WHERE user_id = ?;

-- name: UpdateEmail :exec
UPDATE users
SET email = ?
WHERE user_id = ?;

-- name: UpdatePhone :exec
UPDATE users
SET phone = ?
WHERE user_id = ?;

-- name: UpdatePasswordHash :exec
UPDATE users
SET password_hash = ?, password_updated_at = NOW()
WHERE user_id = ?;

-- name: UpdateAvatarPath :exec
UPDATE users
SET avatar_path = ?
WHERE user_id = ?;

-- name: UpdateUserPrivilege :exec
UPDATE users
SET user_privilege = ?
WHERE user_id = ?;

-- name: UpdateUserBalance :exec
UPDATE users
SET user_balance = ?
WHERE user_id = ?;

-- name: UpdateUserStatus :exec
UPDATE users
SET user_status = ?
WHERE user_id = ?;

-- name: SoftDeleteUser :exec
UPDATE users
SET user_status = 0, deleted_at = NOW()
WHERE user_id = ?;

-- name: UpdateMFAEnabled :exec
UPDATE users
SET mfa_enabled = ?
WHERE user_id = ?;

-- name: UpdateLoginSuccess :exec
UPDATE users
SET last_login_at = NOW(),
        last_login_ip = ?,
        failed_login_attempts = 0,
        locked_until = NULL
WHERE user_id = ?;

-- name: IncrementFailedLoginAttempts :exec
UPDATE users
SET failed_login_attempts = failed_login_attempts + 1
WHERE user_id = ?;

-- name: SetLockedUntil :exec
UPDATE users
SET locked_until = ?
WHERE user_id = ?;
