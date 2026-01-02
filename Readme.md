## Clone
```bash
git clone https://github.com/L1ndenbaum/integrated-corn-assistant.git
```

## Create MySQL Schema
```bash
mysql -u root -p < services/user-service/db/migrations/000001_create_users.up.sql
mysql -u root -p < services/user-service/db/migrations/000001_create_refresh_tokens.up.sql
```

### MySQL User
```sql
CREATE USER 'corn-assistant-user'@'%' IDENTIFIED BY 'USER_SERVICE_PASSWORD';
CREATE USER 'corn-assistant-auth'@'%' IDENTIFIED BY 'AUTH_SERVICE_PASSWORD';
GRANT ALL PRIVILEGES ON corn_assistant_user.* TO 'corn-assistant-user'@'%';
GRANT ALL PRIVILEGES ON corn_assistant_auth.* TO 'corn-assistant-auth'@'%';
```

### Environment Variables In Docker
```bash
cp .env.example .env

# Edit .env file
IMAGE_PREFIX=l1ndenbaum/integrated-corn-assistant
MYSQL_HOST=127.0.0.1
MYSQL_PASSWORD=CHANGE_ME
JWT_SECRET=CHANGE_ME
DIFY_API_KEY=CHANGE_ME
DIFY_BASE_URL=https://api.dify.ai/v1
ALL_PROXY=
AMAP_KEY=CHANGE_ME
DIAGNOSIS_SERVICE_BASE_URL=CHANGE_ME
```

## Pull services from GHCR and deploy
```bash
docker compose pull
docker compose up -d
```

## Pull diagnosis service in a GPU server and deploy container
```bash
docker pull ghcr.io/l1ndenbaum/integrated-corn-assistant-diagnosis-service:latest
docker run -d \
    --gpus all \
    --name diagnosis-service \
    -p CHANGE-TO-YOUR-PORT:DOCKER-ENV-PORT \
    -e CORS_ORIGINS=CHANGE_ME \
    -e PORT=DOCKER-ENV-PORT \
    -e JWT_SECRET=CHANGE_ME \
    -e JWT_ISSUER=corn-assistant \
    ghcr.io/l1ndenbaum/integrated-corn-assistant-diagnosis-service:latest
```

### Diagnosis service gateway routing
Set `DIAGNOSIS_SERVICE_BASE_URL` in `.env` to the remote diagnosis service address, for example:
```
DIAGNOSIS_SERVICE_BASE_URL=http://YOUR-DIAGNOSIS-SERVER-IP:8085
```
