Change log - 0007

Summary:
- Added JWT auth flow design document.
- Added refresh token SQL queries and schema migration.
- Added active user query by UUID.

Files:
- docs/auth.md
- services/user-service/db/queries/refresh_tokens.sql
- services/user-service/db/migrations/000001_create_users.up.sql
- services/user-service/db/migrations/000001_create_users.down.sql
- services/user-service/db/queries/users.sql
