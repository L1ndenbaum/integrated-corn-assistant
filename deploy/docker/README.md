Docker run (auth-service + user-service)

Build images:

```
docker build -t YOUR_DOCKERHUB_USER/corn-assistant-user:latest -f services/user-service/Dockerfile services/user-service
docker build -t YOUR_DOCKERHUB_USER/corn-assistant-auth:latest -f services/auth-service/Dockerfile services/auth-service
```

Run user-service:

```
docker run -d --name user-service -p 8081:8081 \
  -e USER_DB_DSN='root:YOUR_PASS@tcp(127.0.0.1:3306)/corn_assistant_user?parseTime=true' \
  YOUR_DOCKERHUB_USER/corn-assistant-user:latest
```

Run auth-service:

```
docker run -d --name auth-service -p 8082:8082 \
  -e AUTH_DB_DSN='root:YOUR_PASS@tcp(127.0.0.1:3306)/corn_assistant_auth?parseTime=true' \
  -e USER_SERVICE_BASE_URL='http://127.0.0.1:8081' \
  -e JWT_SECRET='CHANGE_ME' \
  -e JWT_ISSUER='corn-assistant' \
  -e ACCESS_TOKEN_TTL='15m' \
  -e REFRESH_TOKEN_TTL='720h' \
  YOUR_DOCKERHUB_USER/corn-assistant-auth:latest
```

Notes:
- If auth-service runs in a container on the same host, replace 127.0.0.1 with
  the host IP or use --network host on Linux.
- Cookies are set by auth-service; gateway should proxy /api/v1/auth/* to it.
