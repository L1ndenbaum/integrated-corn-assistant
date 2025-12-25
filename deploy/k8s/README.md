K3s auth-service + user-service wiring

1) Create secrets (example):

```
kubectl create secret generic corn-assistant-secrets \
  --from-literal=auth_db_dsn='root:YOUR_PASS@tcp(mysql:3306)/corn_assistant_auth?parseTime=true' \
  --from-literal=user_db_dsn='root:YOUR_PASS@tcp(mysql:3306)/corn_assistant_user?parseTime=true' \
  --from-literal=jwt_secret='YOUR_JWT_SECRET'
```

2) Apply manifests:

```
kubectl apply -f deploy/k8s/user-service.yaml
kubectl apply -f deploy/k8s/auth-service.yaml
```

3) Verify service DNS wiring:

- auth-service uses USER_SERVICE_BASE_URL = http://user-service:8081
- user-service internal endpoints are under /internal/user/...

4) End-to-end login test (through gateway):

```
curl -i -X POST http://GATEWAY_HOST/api/v1/auth/login/username \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"demo"}'
```

Expect: Set-Cookie for access_token and refresh_token plus user payload.
