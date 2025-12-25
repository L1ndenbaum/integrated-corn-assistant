Change log - 0011

Summary:
- Implemented auth-service backend skeleton with JWT issuance, refresh, session, and logout handlers.
- Added auth-service config loader, token manager, MySQL refresh token store, and user-service HTTP client.
- Documented internal user-service APIs for auth-service.

Files:
- services/auth-service/go.mod
- services/auth-service/cmd/server/main.go
- services/auth-service/internal/config/config.go
- services/auth-service/internal/auth/manager.go
- services/auth-service/internal/store/store.go
- services/auth-service/internal/store/mysql.go
- services/auth-service/internal/userclient/client.go
- services/auth-service/internal/handler/auth.go
- services/auth-service/internal/server/router.go
- docs/auth.md
