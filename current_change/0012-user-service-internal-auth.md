Change log - 0012

Summary:
- Added user-service internal auth verification endpoints for auth-service.
- Implemented user-service MySQL store for login checks and lockout updates.
- Added user-service server entrypoint and router for internal APIs.

Files:
- services/user-service/cmd/server/main.go
- services/user-service/internal/config/config.go
- services/user-service/internal/crypto/password.go
- services/user-service/internal/handler/internal_auth.go
- services/user-service/internal/server/router.go
- services/user-service/internal/store/store.go
- services/user-service/internal/store/mysql.go
- services/user-service/go.mod
