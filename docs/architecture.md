## Overview

Goal: refactor the current monolith into microservices, containerize each service,
and deploy on k3s with Docker Hub images. Nginx fronts the system and routes
traffic to static-server and api-gateway.

Key constraints:
- Monorepo layout.
- MySQL single instance with per-service schema and per-service DB user.
- Each service owns its own tables and must not access others (DB-level
  isolation enforced by schema permissions and application-level sqlc scope).
- Inter-service async work uses RabbitMQ (for example, avatar updates).

## Target Services

1) api-gateway (Go + Gin)
   - Routes API requests to internal services.
   - No direct DB access.

2) static-server (Go + Gin)
   - Serves frontend static assets (Next.js build output).
   - Serves user avatar files from a dedicated volume.

3) user-service (Go + sqlc + MySQL)
   - Register/login/change password/update avatar.
   - Own tables: users, user_avatars (or users.avatar).

4) auth-service (Go + JWT + MySQL)
   - Issues access/refresh tokens.
   - Own tables: refresh tokens (no direct user data).

5) chat-service (Python + FastAPI + LangChain)
   - Chat workflow, sessions, messages, file metadata.
   - Own tables: chat_conversations, chat_messages, chat_files.

6) weather-service (Go)
   - Calls AMap weather APIs.
   - No DB required (optional cache table later).

7) diagnosis-service (Python)
   - Image diagnosis API.
   - Own tables: diagnosis_jobs, diagnosis_results (optional).

## Proposed Ports (local dev / container)

- api-gateway: 8080
- static-server: 8086
- user-service: 8081
- auth-service: 8082
- chat-service: 8083
- weather-service: 8084
- diagnosis-service: 8085

In k3s, each service gets a ClusterIP Service and is reachable by
service DNS name (for example, `user-service.default.svc.cluster.local:8081`).

## Monorepo Layout (target)

/
  client/                 frontend (Next.js)
  static-server/          static site + avatar server (renamed from server-go)
  api-gateway/            API gateway (Go + Gin)
  services/
    user-service/         new Go module (sqlc)
    auth-service/         new Go module (sqlc + JWT)
    chat-service/         new Python service
    weather-service/      new Go service
    diagnosis-service/    Python FastAPI service
  deploy/
    k8s/                  manifests or Helm charts
  docs/
    architecture.md

## Data Ownership

- Each service gets its own schema (database) and a dedicated MySQL user with
  permissions only on that schema.
- Each service defines only its own SQL files and sqlc generation.
- api-gateway never touches the DB.

Root is used only for provisioning schemas/users, not by services.

Schema naming uses full, semantic words (no abbreviations).
Current schema names:
- corn_assistant_user
- corn_assistant_auth

## API Routing

External APIs (client -> api-gateway -> services):
- /api/v1/user/*        -> user-service
- /api/v1/auth/*        -> auth-service
- /api/v1/chat/*        -> chat-service
- /api/v1/geo/*         -> weather-service
- /api/v1/diagnosis/*   -> diagnosis-service

Internal APIs (service -> service, not exposed to clients):
- /internal/user/{user_id}
- /internal/auth/refresh_token

Internal APIs are called directly between services over the cluster network.

## Messaging (RabbitMQ)

- Used for async work between services.
- Example: api-gateway handles avatar file upload, then publishes a message for
  user-service to update the avatar path in its own schema.

## Next Steps (planned sequence)

1) Extract user-service with sqlc and Dockerfile.
2) Replace monolith user routes with gateway proxy to user-service.
3) Extract weather-service (simple) and proxy via gateway.
4) Build chat-service with LangChain and migrate frontend calls.
5) Containerize diagnosis-service and proxy via gateway.
6) Add k3s manifests + GitHub Actions pipeline (build, push, deploy).
