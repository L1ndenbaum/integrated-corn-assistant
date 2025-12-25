## JWT Auth Design

This document defines the login and token refresh flow for auth-service and
the expectations for gateway and frontend.

## Tokens

- Access token (JWT, HS256)
  - Short lived (example: 15 minutes).
  - Set by auth-service via `Set-Cookie` as `access_token`.
  - Contains user identity and authorization claims.

- Refresh token (opaque random string)
  - Long lived (example: 30 days).
  - Set by auth-service via `Set-Cookie` as `refresh_token` (httpOnly).
  - Only the hash (SHA-256) is stored in the auth-service database.

## Claims (access token)

- sub: user UUID (string, UUIDv7 format)
- uid: user_id (int)
- username
- privilege (int)
- status (int)
- mfa (bool/int)
- iat, exp, iss

## Login Flow (external)

1) Client sends login credentials via one of:
   - POST /api/v1/auth/login/username
   - POST /api/v1/auth/login/email
   - POST /api/v1/auth/login/phone
2) auth-service calls user-service internal API to verify:
   - user_status == 1
   - password hash matches
   - not locked (locked_until is NULL or in the past)
3) auth-service issues:
   - access_token (JWT)
   - refresh_token (random)
4) auth-service stores refresh token hash in its own table.
5) Response sets cookies and returns a minimal user profile.

## Session Check (external)

1) Client sends GET /api/v1/auth/session with cookies.
2) auth-service validates access_token.
3) On success, returns minimal user profile.

## Refresh Flow (internal / external)

1) Client sends refresh request with refresh_token cookie.
2) auth-service hashes refresh token and looks up an active token record:
   - revoked_at IS NULL
   - expires_at > NOW()
3) auth-service rotates the token:
   - create a new refresh token record
   - revoke the old record (revoked_at, replaced_by_id)
4) auth-service returns a new access token and refresh token.

## Logout Flow

- Revoke the refresh token record (or all tokens for the user).
- Clear access_token and refresh_token cookies.

## API Shapes (external)

Login (username):
    POST /api/v1/auth/login/username
    { "username": "name", "password": "..." }

Login (email):
    POST /api/v1/auth/login/email
    { "email": "user@example.com", "password": "..." }

Login (phone):
    POST /api/v1/auth/login/phone
    { "phone": "+8613800138000", "password": "..." }

Session:
    GET /api/v1/auth/session
    Response:
    {
        "user": {
            "user_uuid": "...",
            "username": "...",
            "avatar_path": "...",
            "user_privilege": 0
        }
    }

## Internal APIs (auth-service -> user-service)

Verify username/password:
    POST /internal/user/verify/username
    { "username": "...", "password": "..." }

Verify email/password:
    POST /internal/user/verify/email
    { "email": "...", "password": "..." }

Verify phone/password:
    POST /internal/user/verify/phone
    { "phone": "...", "password": "..." }

Profile by UUID:
    GET /internal/user/profile/uuid/{user_uuid}
    Response:
    {
        "user": {
            "user_uuid": "...",
            "user_id": 1,
            "username": "...",
            "avatar_path": "...",
            "user_privilege": 0,
            "user_status": 1,
            "mfa_enabled": false
        }
    }

## Environment Variables

- AUTH_DB_DSN (required)
- USER_SERVICE_BASE_URL (required)
- JWT_SECRET (required)
- ACCESS_TOKEN_TTL (example: 15m)
- REFRESH_TOKEN_TTL (example: 720h)
- JWT_ISSUER (example: corn-assistant)
- COOKIE_DOMAIN (optional)
- COOKIE_SECURE (true/false, default false)
- COOKIE_SAMESITE (lax/strict/none, default lax)

K3s example:
- USER_SERVICE_BASE_URL=http://user-service:8081

## Notes

- Access token should be httpOnly; frontend relies on /api/v1/auth/session.
- Gateway only proxies; it does not issue tokens.
