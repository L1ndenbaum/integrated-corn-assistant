Change log - 0008

Summary:
- Moved refresh token storage to auth-service schema.
- Added auth-service sqlc config, schema, migrations, and queries.
- Updated architecture and auth docs to reflect auth-service ownership.

Files:
- docs/architecture.md
- docs/auth.md
- services/auth-service/sqlc.yaml
- services/auth-service/db/schema.sql
- services/auth-service/db/migrations/000001_create_refresh_tokens.up.sql
- services/auth-service/db/migrations/000001_create_refresh_tokens.down.sql
- services/auth-service/db/queries/refresh_tokens.sql
- services/auth-service/go.mod
- services/user-service/db/schema.sql
- services/user-service/db/migrations/000001_create_users.up.sql
- services/user-service/db/migrations/000001_create_users.down.sql
