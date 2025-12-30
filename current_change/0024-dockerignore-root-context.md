# Root .dockerignore for user-service build

- Add root .dockerignore to keep the user-service build context small when using context '.'.
- Excludes unrelated services and frontend artifacts while keeping /services/user-service and /common.
