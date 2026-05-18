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

echo "=== HR Web Client Develop Smoke ==="
echo "PROJECT_NAME=${PROJECT_NAME}"
echo "COMPOSE_FILE=${COMPOSE_FILE}"

echo ""
echo "--- Docker Compose service status (hr-web-client) ---"
compose ps hr-web-client || true

echo ""
echo "--- Live container status (hr-web-client) ---"
docker ps \
  --filter "label=com.docker.compose.project=${PROJECT_NAME}" \
  --filter "label=com.docker.compose.service=hr-web-client" \
  --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' || true

# Locate the web container: prefer compose label, fall back to grep on name.
HR_WEB_CONTAINER="$(
  docker ps \
    --filter "label=com.docker.compose.project=${PROJECT_NAME}" \
    --filter "label=com.docker.compose.service=hr-web-client" \
    --format '{{.Names}}' \
    | head -1
)"
if [ -z "${HR_WEB_CONTAINER}" ]; then
  HR_WEB_CONTAINER="$(docker ps --format '{{.Names}}' | grep -E "${PROJECT_NAME}-hr-web-client" | head -1)"
fi

if [ -z "${HR_WEB_CONTAINER}" ]; then
  echo "ERROR: HR Web container not found in project ${PROJECT_NAME}" >&2
  echo "Running containers:" >&2
  docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep -Ei "hr|web" || true >&2
  exit 64
fi

echo ""
echo "--- Container inspect: ${HR_WEB_CONTAINER} ---"
docker inspect "${HR_WEB_CONTAINER}" --format '
Name={{.Name}}
Image={{.Config.Image}}
Status={{.State.Status}}
Health={{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}
StartedAt={{.State.StartedAt}}
' 2>&1 || true

CONTAINER_STATUS="$(docker inspect "${HR_WEB_CONTAINER}" --format '{{.State.Status}}' 2>/dev/null || echo "unknown")"
if [ "${CONTAINER_STATUS}" = "exited" ]; then
  echo "ERROR: Container ${HR_WEB_CONTAINER} has exited" >&2
  docker logs "${HR_WEB_CONTAINER}" --tail=100 >&2 || true
  exit 64
fi

if [ "${CONTAINER_STATUS}" = "unknown" ]; then
  echo "ERROR: Could not determine container status for ${HR_WEB_CONTAINER}" >&2
  exit 64
fi

echo ""
echo "--- HR Web health check via docker exec (container-internal /healthz) ---"
WEB_HEALTH_OK=0
for i in $(seq 1 30); do
  if docker exec "${HR_WEB_CONTAINER}" sh -lc 'wget -qO- http://127.0.0.1/healthz' 2>/dev/null | grep -qi 'ok\|healthy\|200\|up'; then
    echo "HR Web health check passed (attempt ${i}/30)"
    WEB_HEALTH_OK=1
    break
  fi

  if [ "${i}" = "30" ]; then
    echo "ERROR: HR Web health check failed after 30 retries" >&2
    echo ""
    echo "--- Docker Compose status ---" >&2
    compose ps hr-web-client >&2 || true
    echo ""
    echo "--- All HR containers ---" >&2
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep -Ei "hr|web" || true >&2
    echo ""
    echo "--- Last 100 lines of web container logs ---" >&2
    docker logs "${HR_WEB_CONTAINER}" --tail=100 >&2 || true
    exit 64
  fi

  echo "Waiting for HR Web health... attempt ${i}/30"
  sleep 3
done

if [ "${WEB_HEALTH_OK}" -ne 1 ]; then
  exit 64
fi

# Also health-check the HR API container (web dependency).
# Use compose labels to locate it; same project name.
echo ""
echo "--- Locating HR API container (dependency of hr-web-client) ---"
HR_API_CONTAINER="$(
  docker ps \
    --filter "label=com.docker.compose.project=${PROJECT_NAME}" \
    --filter "label=com.docker.compose.service=hr-api" \
    --format '{{.Names}}' \
    | head -1
)"
if [ -z "${HR_API_CONTAINER}" ]; then
  HR_API_CONTAINER="$(docker ps --format '{{.Names}}' | grep -E "${PROJECT_NAME}-hr-api" | head -1)"
fi

if [ -n "${HR_API_CONTAINER}" ]; then
  echo "HR API container detected: ${HR_API_CONTAINER}"
  API_CONTAINER_PORT="${HR_API_CONTAINER_PORT:-3000}"
  API_PREFIX="${HR_API_PREFIX:-api/v1}"
  API_HEALTH_ENDPOINT="http://127.0.0.1:${API_CONTAINER_PORT}/${API_PREFIX}/health"

  echo "--- HR API container inspect: ${HR_API_CONTAINER} ---"
  docker inspect "${HR_API_CONTAINER}" --format '
Status={{.State.Status}}
Health={{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}
StartedAt={{.State.StartedAt}}
' 2>&1 || true

  API_CONTAINER_STATUS="$(docker inspect "${HR_API_CONTAINER}" --format '{{.State.Status}}' 2>/dev/null || echo "unknown")"
  if [ "${API_CONTAINER_STATUS}" = "exited" ]; then
    echo "ERROR: HR API container ${HR_API_CONTAINER} has exited" >&2
    docker logs "${HR_API_CONTAINER}" --tail=100 >&2 || true
    exit 64
  fi

  echo ""
  echo "--- HR API health check via docker exec (container-internal: ${API_HEALTH_ENDPOINT}) ---"
  API_HEALTH_OK=0
  for i in $(seq 1 30); do
    if docker exec "${HR_API_CONTAINER}" sh -lc "wget -qO- '${API_HEALTH_ENDPOINT}'" 2>/dev/null | grep -q '"ok"\|OK\|"status"' 2>/dev/null; then
      echo "HR API health check passed (attempt ${i}/30)"
      API_HEALTH_OK=1
      break
    fi

    if [ "${i}" = "30" ]; then
      echo "ERROR: HR API health check failed after 30 retries" >&2
      echo ""
      echo "--- Last 100 lines of API container logs ---" >&2
      docker logs "${HR_API_CONTAINER}" --tail=100 >&2 || true
      exit 64
    fi

    echo "Waiting for HR API health... attempt ${i}/30"
    sleep 3
  done

  if [ "${API_HEALTH_OK}" -ne 1 ]; then
    exit 64
  fi
else
  echo "WARNING: HR API container not found in project ${PROJECT_NAME}. Skipping API dependency check."
  echo "If HR API is deployed as a separate compose project, ensure it is healthy before running this smoke."
fi

echo ""
echo "--- Compose service status snapshot ---"
compose ps hr-web-client || true

echo ""
echo "--- System status snapshot (informational) ---"
docker ps --format 'table {{.Names}}\t{{.Status}}' || true

echo ""
echo "=== HR Web Client Develop Smoke PASSED ==="
