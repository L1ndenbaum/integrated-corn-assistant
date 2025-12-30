# API gateway scaffold

- Add api-gateway service (Go + Gin) with reverse proxies for auth/user/chat/weather/diagnosis.
- Add Dockerfile and GitHub Actions build step for api-gateway.
- Add api-gateway to docker-compose and update docs layout.
- Exclude api-gateway from root .dockerignore (for user-service build context).
