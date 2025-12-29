# JWT shared middleware

- Add `services/common/jwtauth` with a shared JWT verifier + Gin middleware.
- Auth-service now uses shared middleware for `/api/v1/auth/session`.
- User-service adds JWT-protected `/api/v1/user/profile` and loads `JWT_SECRET`/`JWT_ISSUER` from env.
- Docker build contexts updated to include `services/common` for auth/user services.
