#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-hr-dev}"
COMMON_ENV_FILE="${COMMON_ENV_FILE:-env/.env.hr.develop}"
SERVICE_ENV_FILE="${SERVICE_ENV_FILE:-env/.env.hr-web.develop}"
VERSIONS_ENV_FILE="${VERSIONS_ENV_FILE:-env/.env.versions}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/compose/develop.yml}"
SERVICE_NAME="hr-web-client"
IMAGE_TAG="${HR_WEB_VERSION:-${IMAGE_TAG:-${1:-}}}"

if [ -z "${IMAGE_TAG}" ]; then
  echo "HR_WEB_VERSION, IMAGE_TAG, or first positional image tag is required" >&2
  exit 1
fi

for file in "${COMMON_ENV_FILE}" "${SERVICE_ENV_FILE}" "${COMPOSE_FILE}"; do
  test -f "${file}" || { echo "Missing required file: ${file}" >&2; exit 1; }
done

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

: "${CHAT_NETWORK:?CHAT_NETWORK is required in ${COMMON_ENV_FILE}}"
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

echo "Deploying ghcr.io/hacom-holding-dx/hr-web-client:${HR_WEB_VERSION}"
compose config --quiet
compose pull "${SERVICE_NAME}"
compose up -d --no-deps --wait "${SERVICE_NAME}"
compose ps "${SERVICE_NAME}"
"${ROOT_DIR}/deploy/scripts/smoke-develop.sh"
