#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-hr-dev}"
COMMON_ENV_FILE="${COMMON_ENV_FILE:-${SERVER_RUNTIME_ENV_FILE:-env/.env.hr-web.develop}}"
INCOMING_HR_API_HEALTH_URL="${HR_API_HEALTH_URL:-}"
if [ -z "${VERSIONS_ENV_FILE:-}" ]; then
  if [ -n "${SERVER_RUNTIME_ENV_FILE:-}" ]; then
    VERSIONS_ENV_FILE="$(dirname "${SERVER_RUNTIME_ENV_FILE}")/.hr-web-client.versions"
  else
    VERSIONS_ENV_FILE="env/.env.versions"
  fi
fi
COMPOSE_FILE="${COMPOSE_FILE:-deploy/compose/develop.yml}"

test -f "${COMMON_ENV_FILE}"

set -a
. "${COMMON_ENV_FILE}"
if [ -f "${VERSIONS_ENV_FILE}" ]; then
  . "${VERSIONS_ENV_FILE}"
fi
set +a
if [ -n "${INCOMING_HR_API_HEALTH_URL}" ]; then
  HR_API_HEALTH_URL="${INCOMING_HR_API_HEALTH_URL}"
fi
export HR_WEB_ENV_FILE="${COMMON_ENV_FILE}"
export HR_WEB_VERSION="${HR_WEB_VERSION:-smoke}"

if [ -z "${HR_API_HEALTH_URL:-}" ]; then
  echo "ERROR: HR_API_HEALTH_URL is required for deploy smoke check." >&2
  echo "Example: HR_API_HEALTH_URL=http://127.0.0.1:<actual_hr_api_port>/api/health" >&2
  exit 64
fi
if [[ "${HR_API_HEALTH_URL}" == *"CHANGE_ME"* || "${HR_API_HEALTH_URL}" == *"change-me"* || "${HR_API_HEALTH_URL}" == *"<actual_hr_api_port>"* ]]; then
  echo "ERROR: HR_API_HEALTH_URL still contains a placeholder value." >&2
  exit 64
fi

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

web_url="${HR_WEB_HEALTH_URL:-http://127.0.0.1:${HR_WEB_HOST_PORT:-3400}/healthz}"
public_url="${HR_WEB_PUBLIC_URL:-http://127.0.0.1:${HR_WEB_HOST_PORT:-3400}/}"

echo "Smoke context: running on the deploy host shell; HR_API_HEALTH_URL must be reachable from this host."
echo "Smoke: ${web_url}"
curl -fsS "${web_url}" >/dev/null
curl -fsS "${public_url}" | grep -E '<script|/assets/' >/dev/null

echo "Smoke: checking HR API health: ${HR_API_HEALTH_URL}"
if ! curl -fsS --connect-timeout 5 --max-time 15 "${HR_API_HEALTH_URL}" >/dev/null; then
  echo "ERROR: HR API health check failed." >&2
  echo "Checked URL: ${HR_API_HEALTH_URL}" >&2
  echo "Hints:" >&2
  echo "  - Is hr-api-service deployed and running?" >&2
  echo "  - Is the API listening on the configured host/port?" >&2
  echo "  - If smoke runs on host, do not use Docker-only service DNS." >&2
  echo "  - If smoke runs in container, do not use 127.0.0.1 for another container." >&2
  exit 7
fi
echo "Smoke: HR API health reachable"

compose ps hr-web-client

echo "Chat stack status snapshot; this script does not recreate chat containers."
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'chat-|edge-proxy|postgres|mongo|redis|kafka|minio' || true
if docker ps --format '{{.Names}} {{.Status}}' | grep -E 'chat-|edge-proxy|postgres|mongo|redis|kafka|minio' | grep -qi unhealthy; then
  echo "Detected unhealthy chat/infra container after HR web deploy" >&2
  exit 1
fi
