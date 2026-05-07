#!/usr/bin/env bash
set -Eeuo pipefail

: "${HR_API_HEALTH_URL:?HR_API_HEALTH_URL is required for HR Web production deploy smoke check.}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-hr-prod}"
COMMON_ENV_FILE="${COMMON_ENV_FILE:-${SERVER_RUNTIME_ENV_FILE:-env/.env.hr-web.production}}"
if [ -z "${VERSIONS_ENV_FILE:-}" ]; then
  if [ -n "${SERVER_RUNTIME_ENV_FILE:-}" ]; then
    VERSIONS_ENV_FILE="$(dirname "${SERVER_RUNTIME_ENV_FILE}")/.hr-web-client.versions"
  else
    VERSIONS_ENV_FILE="env/.env.versions"
  fi
fi
COMPOSE_FILE="${COMPOSE_FILE:-deploy/compose/production.yml}"

test -f "${COMMON_ENV_FILE}"

set -a
. "${COMMON_ENV_FILE}"
if [ -f "${VERSIONS_ENV_FILE}" ]; then
  . "${VERSIONS_ENV_FILE}"
fi
set +a
export HR_WEB_ENV_FILE="${COMMON_ENV_FILE}"
export HR_WEB_VERSION="${HR_WEB_VERSION:-smoke}"

compose() {
  local compose_args=(
    -p "${PROJECT_NAME}"
    --env-file "${COMMON_ENV_FILE}"
  )
  if [ -f "${VERSIONS_ENV_FILE}" ]; then
    compose_args+=(--env-file "${VERSIONS_ENV_FILE}")
  fi
  compose_args+=(-f "${COMPOSE_FILE}")
  docker compose "${compose_args[@]}" "$@"
}

echo "Checking HR API health: ${HR_API_HEALTH_URL}"
for i in $(seq 1 30); do
  if curl -fsS --max-time 5 "${HR_API_HEALTH_URL}" >/dev/null; then
    echo "HR API health check passed."
    break
  fi

  if [ "${i}" = "30" ]; then
    echo "ERROR: HR API health check failed: ${HR_API_HEALTH_URL}" >&2
    exit 64
  fi

  echo "Waiting for HR API health... attempt ${i}/30"
  sleep 2
done

compose ps hr-web-client

echo "System status snapshot (informational only):"
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'hr-|edge-proxy|postgres|redis' || true

# Only containers owned by this deploy scope are required.
# Unrelated unhealthy containers emit a WARNING and do NOT fail this deploy.
UNRELATED_UNHEALTHY="$(docker ps --format '{{.Names}} {{.Status}}' \
  | grep -v "${PROJECT_NAME}-hr-web-client" \
  | grep -i unhealthy || true)"
if [ -n "${UNRELATED_UNHEALTHY}" ]; then
  echo "WARNING: unhealthy containers outside hr-web-client deploy scope detected:"
  echo "${UNRELATED_UNHEALTHY}"
  echo "Not failing this deploy — these containers are unrelated to hr-web-client."
fi
