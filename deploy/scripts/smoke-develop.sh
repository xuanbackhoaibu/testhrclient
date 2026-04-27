#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-hr-dev}"
COMMON_ENV_FILE="${COMMON_ENV_FILE:-${SERVER_RUNTIME_ENV_FILE:-env/.env.hr-web.develop}}"
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

web_url="${HR_WEB_HEALTH_URL:-http://127.0.0.1:${HR_WEB_HOST_PORT:-3400}/healthz}"
public_url="${HR_WEB_PUBLIC_URL:-http://127.0.0.1:${HR_WEB_HOST_PORT:-3400}/}"

echo "Smoke: ${web_url}"
curl -fsS "${web_url}" >/dev/null
curl -fsS "${public_url}" | grep -E '<script|/assets/' >/dev/null

if [ -n "${HR_API_HEALTH_URL:-}" ]; then
  echo "Smoke: HR web host can reach HR API health URL ${HR_API_HEALTH_URL}"
  if curl -fsS "${HR_API_HEALTH_URL}" >/dev/null; then
    echo "Smoke: HR API health reachable"
  elif [ "${HR_WEB_REQUIRE_API_HEALTH:-false}" = "true" ]; then
    echo "HR API health check failed and HR_WEB_REQUIRE_API_HEALTH=true" >&2
    exit 1
  else
    echo "WARN: HR API health check failed; continuing because HR_WEB_REQUIRE_API_HEALTH is not true" >&2
  fi
fi

compose ps hr-web-client

echo "Chat stack status snapshot; this script does not recreate chat containers."
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'chat-|edge-proxy|postgres|mongo|redis|kafka|minio' || true
if docker ps --format '{{.Names}} {{.Status}}' | grep -E 'chat-|edge-proxy|postgres|mongo|redis|kafka|minio' | grep -qi unhealthy; then
  echo "Detected unhealthy chat/infra container after HR web deploy" >&2
  exit 1
fi
