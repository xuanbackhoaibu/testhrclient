#!/usr/bin/env bash
set -Eeuo pipefail

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

health_url="${HR_API_HEALTH_URL:-}"
if [ -z "${health_url}" ]; then
  echo "ERROR: HR_API_HEALTH_URL is required for smoke test" >&2
  exit 64
fi

echo "Smoke production hr-web-client: checking HR API at ${health_url}"
curl -fsS "${health_url}" >/dev/null
echo "PASS hr-api health"

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
