#!/bin/sh
# Injected into /docker-entrypoint.d/ in the nginx image.
# The official nginx entrypoint runs all scripts in that directory before
# starting nginx, so this script must exit 0 — do NOT exec nginx here.
#
# Replaces build-time placeholders in the Vite JS bundle with runtime values
# from the container's environment (supplied via docker-compose env_file).
# This lets environment-specific URLs live in the server .env file rather than
# requiring a separate Docker image build per environment.
set -e

HTML_DIR=/usr/share/nginx/html

replace() {
  placeholder="$1"
  value="$2"
  [ -z "$value" ] && return 0
  grep -rl "$placeholder" "$HTML_DIR" | while IFS= read -r file; do
    sed -i "s|${placeholder}|${value}|g" "$file"
  done
}

replace "__VITE_AUTH_API_BASE_URL__"      "${VITE_AUTH_API_BASE_URL:-}"
replace "__VITE_AUTH_SERVICE_BASE_URL__"  "${VITE_AUTH_SERVICE_BASE_URL:-}"
replace "__VITE_AUTH_SERVICE_LOGIN_URL__" "${VITE_AUTH_SERVICE_LOGIN_URL:-}"
replace "__VITE_AUTH_SERVICE_LOGOUT_URL__" "${VITE_AUTH_SERVICE_LOGOUT_URL:-}"
