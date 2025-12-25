Change log - 0004

Summary:
- Added sqlc queries for users.
- Added legacy user migration tool (Go) to generate UUIDv7 and copy data.
- Added initial go.mod for user-service.

Files:
- services/user-service/db/queries/users.sql
- services/user-service/cmd/migrate_legacy_users/main.go
- services/user-service/go.mod
