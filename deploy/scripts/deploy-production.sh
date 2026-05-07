#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

RELEASE_ENV_FILE="${ROOT_DIR}/.release.env"
if [ ! -f "${RELEASE_ENV_FILE}" ]; then
  echo "Missing release env file: ${RELEASE_ENV_FILE}" >&2
  exit 1
fi

set -a
source "${RELEASE_ENV_FILE}"
set +a

required_release_vars=(
  DEPLOY_ENV
  SERVICE_NAME
  SERVER_RUNTIME_ENV_FILE
  IMAGE_REF
  COMPOSE_FILE
  COMPOSE_PROJECT_NAME
  RUNTIME_SERVICE
)

for var in "${required_release_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "Missing required app release configuration: ${var}" >&2
    exit 1
  fi
done

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-hr-prod}"
COMMON_ENV_FILE="${COMMON_ENV_FILE:-${SERVER_RUNTIME_ENV_FILE}}"
SERVICE_ENV_FILE="${SERVICE_ENV_FILE:-${SERVER_RUNTIME_ENV_FILE}}"
INCOMING_HR_API_HEALTH_URL="${HR_API_HEALTH_URL:-}"
if [ -z "${VERSIONS_ENV_FILE:-}" ]; then
  if [ -n "${SERVER_RUNTIME_ENV_FILE:-}" ]; then
    VERSIONS_ENV_FILE="$(dirname "${SERVER_RUNTIME_ENV_FILE}")/.hr-web-client.versions"
  else
    VERSIONS_ENV_FILE="env/.env.versions"
  fi
fi
COMPOSE_FILE="${COMPOSE_FILE:-deploy/compose/production.yml}"
SERVICE_NAME="${RUNTIME_SERVICE:-hr-web-client}"
IMAGE_TAG="${HR_WEB_VERSION:-${IMAGE_TAG:-${1:-${IMAGE_REF##*:}}}}"

if [ -z "${IMAGE_TAG}" ]; then
  echo "HR_WEB_VERSION, IMAGE_TAG, or first positional image tag is required" >&2
  exit 1
fi

if [ ! -f "${SERVER_RUNTIME_ENV_FILE}" ]; then
  echo "Runtime env file does not exist on server: ${SERVER_RUNTIME_ENV_FILE}" >&2
  exit 1
fi

for file in "${COMMON_ENV_FILE}" "${SERVICE_ENV_FILE}" "${COMPOSE_FILE}"; do
  test -f "${file}" || { echo "Missing required file: ${file}" >&2; exit 1; }
done

case "${COMMON_ENV_FILE} ${SERVICE_ENV_FILE}" in
  *develop*|*server-test*)
    echo "Refusing production deploy: runtime env file path points to develop or server-test" >&2
    exit 1
    ;;
esac

if grep -R -n -E 'CHANGE_ME|change-me' "${COMMON_ENV_FILE}" "${SERVICE_ENV_FILE}"; then
  echo "Refusing deploy: env file still contains placeholder values" >&2
  exit 1
fi

mkdir -p "$(dirname "${VERSIONS_ENV_FILE}")"
tmp_versions="$(mktemp)"
if [ -f "${VERSIONS_ENV_FILE}" ]; then
  grep -v '^HR_WEB_VERSION=' "${VERSIONS_ENV_FILE}" > "${tmp_versions}" || true
fi
printf 'HR_WEB_VERSION=%s\n' "${IMAGE_TAG}" >> "${tmp_versions}"
mv "${tmp_versions}" "${VERSIONS_ENV_FILE}"

set -a
. "${COMMON_ENV_FILE}"
. "${VERSIONS_ENV_FILE}"
set +a
if [ -n "${INCOMING_HR_API_HEALTH_URL}" ]; then
  HR_API_HEALTH_URL="${INCOMING_HR_API_HEALTH_URL}"
fi
export HR_WEB_ENV_FILE="${SERVICE_ENV_FILE}"

: "${CHAT_NETWORK:?CHAT_NETWORK is required in ${COMMON_ENV_FILE}}"
if [ -z "${HR_API_HEALTH_URL:-}" ]; then
  echo "ERROR: HR_API_HEALTH_URL is required for HR Web production deploy smoke check." >&2
  exit 64
fi
docker network inspect "${CHAT_NETWORK}" >/dev/null

compose() {
  docker compose \
    -p "${PROJECT_NAME}" \
    --env-file "${COMMON_ENV_FILE}" \
    --env-file "${VERSIONS_ENV_FILE}" \
    -f "${COMPOSE_FILE}" \
    "$@"
}

trap 'echo "Deploy failed"; compose ps hr-web-client || true; compose logs --tail=200 hr-web-client || true' ERR

echo "Deploying ghcr.io/hacom-holding-dx/hr-web-client:${HR_WEB_VERSION} to production"
compose config --quiet
compose pull "${SERVICE_NAME}"
compose up -d --no-deps --wait "${SERVICE_NAME}"
compose ps "${SERVICE_NAME}"
HR_API_HEALTH_URL="${HR_API_HEALTH_URL}" "${ROOT_DIR}/deploy/scripts/smoke-production.sh"
