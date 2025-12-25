Change log - 0009

Summary:
- Added auth-service schema and sqlc queries for refresh tokens.
- Updated auth docs to use Set-Cookie for access/refresh tokens.
- Updated frontend auth guard and login flow to rely on auth-service session checks.

Files:
- docs/architecture.md
- docs/auth.md
- client/components/common/auth/auth-guard.tsx
- client/components/home/user-auth-button.tsx
- client/components/common/navigation/user-menu.tsx
- client/app/auth/login/page.tsx
- services/auth-service/db/schema.sql
- services/auth-service/db/queries/refresh_tokens.sql
