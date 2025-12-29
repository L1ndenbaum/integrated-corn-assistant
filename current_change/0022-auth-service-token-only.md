# Auth-service token-only flow

- Remove /api/v1/auth/session and JWT middleware usage from auth-service.
- Auth-service now only issues/refreshes tokens and sets cookies, with simple message responses.
- Frontend session checks now call user-service /api/v1/user/profile.
- docs/auth.md updated to reflect token-only auth-service and profile endpoint.
