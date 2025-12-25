#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

: "${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}"

MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"

LEGACY_SCHEMA="${LEGACY_SCHEMA:-crop_chat_db}"
LEGACY_TABLE="${LEGACY_TABLE:-user}"
TARGET_SCHEMA_USER="${TARGET_SCHEMA_USER:-corn_assistant_user}"
TARGET_SCHEMA_AUTH="${TARGET_SCHEMA_AUTH:-corn_assistant_auth}"

USER_MIGRATION="${ROOT_DIR}/services/user-service/db/migrations/000001_create_users.up.sql"
AUTH_MIGRATION="${ROOT_DIR}/services/auth-service/db/migrations/000001_create_refresh_tokens.up.sql"

if ! command -v mysql >/dev/null 2>&1; then
  echo "mysql client not found in PATH" >&2
  exit 1
fi

if ! command -v go >/dev/null 2>&1; then
  echo "go toolchain not found in PATH" >&2
  exit 1
fi

export MYSQL_PWD="${MYSQL_PASSWORD}"

mysql -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u "${MYSQL_USER}" \
  -e "CREATE DATABASE IF NOT EXISTS \`${TARGET_SCHEMA_USER}\`; CREATE DATABASE IF NOT EXISTS \`${TARGET_SCHEMA_AUTH}\`;"

mysql -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u "${MYSQL_USER}" "${TARGET_SCHEMA_USER}" < "${USER_MIGRATION}"
mysql -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u "${MYSQL_USER}" "${TARGET_SCHEMA_AUTH}" < "${AUTH_MIGRATION}"

export MYSQL_DSN="${MYSQL_USER}:${MYSQL_PASSWORD}@tcp(${MYSQL_HOST}:${MYSQL_PORT})/?parseTime=true&multiStatements=true"
export LEGACY_SCHEMA
export LEGACY_TABLE
export TARGET_SCHEMA="${TARGET_SCHEMA_USER}"

if [[ -n "${LEGACY_AVATAR_COLUMN:-}" ]]; then
  export LEGACY_AVATAR_COLUMN
fi

pushd "${ROOT_DIR}/services/user-service" >/dev/null
go run ./cmd/migrate_legacy_users
popd >/dev/null

mysql -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u "${MYSQL_USER}" -e \
  "SELECT COUNT(*) AS legacy_count FROM \`${LEGACY_SCHEMA}\`.\`${LEGACY_TABLE}\`; SELECT COUNT(*) AS new_count FROM \`${TARGET_SCHEMA_USER}\`.users;"

unset MYSQL_PWD

echo "Migration completed."
