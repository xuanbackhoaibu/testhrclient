ARG NODE_VERSION=20-alpine

# NOTE: build context MUST be the workspace root (the directory containing both
# `hr-web-client/` and `chat-shared-types/`), and the build invoked with
# `--file hr-web-client/Dockerfile`. hr-web-client depends on
# `@hacom/chat-shared-types` via `file:../chat-shared-types`, so the sibling
# package must be present in the build context and built before the client.
FROM node:${NODE_VERSION} AS deps
WORKDIR /workspace

COPY chat-shared-types/package*.json ./chat-shared-types/
WORKDIR /workspace/chat-shared-types
RUN npm ci

WORKDIR /workspace
# package*.json matches both package.json AND package-lock.json (if present),
# so the build doesn't hard-fail when the lockfile is missing from context.
COPY hr-web-client/package*.json ./hr-web-client/
WORKDIR /workspace/hr-web-client
# Use ci (fast, deterministic) when lockfile exists; fall back to install otherwise.
RUN npm ci 2>/dev/null || npm install --no-audit --no-fund

FROM deps AS build
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_USE_MOCKS=false
ARG VITE_AUTH_MODE=chat-auth
ARG VITE_APP_SYSTEM_CODE=HRM
# These absolute-URL vars are baked as placeholders at build time and replaced
# at container startup by deploy/docker/entrypoint.sh using runtime env vars.
ARG VITE_AUTH_API_BASE_URL=__VITE_AUTH_API_BASE_URL__
ARG VITE_AUTH_SERVICE_BASE_URL=__VITE_AUTH_SERVICE_BASE_URL__
ARG VITE_AUTH_SERVICE_LOGIN_URL=__VITE_AUTH_SERVICE_LOGIN_URL__
ARG VITE_AUTH_SERVICE_LOGOUT_URL=__VITE_AUTH_SERVICE_LOGOUT_URL__
ARG VITE_AUTH_SERVICE_CLIENT_ID=hr-web-client
ARG VITE_AUTH_SERVICE_REDIRECT_URI=/auth/callback
# Backward-compat aliases — also substituted at runtime
ARG VITE_CHAT_AUTH_BASE_URL=__VITE_AUTH_SERVICE_BASE_URL__
ARG VITE_CHAT_AUTH_LOGIN_URL=__VITE_AUTH_SERVICE_LOGIN_URL__
ARG VITE_CHAT_AUTH_LOGOUT_URL=__VITE_AUTH_SERVICE_LOGOUT_URL__
ARG VITE_CHAT_AUTH_CLIENT_ID=hr-web-client
ARG VITE_CHAT_AUTH_REDIRECT_URI=/auth/callback

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_USE_MOCKS=${VITE_USE_MOCKS}
ENV VITE_AUTH_MODE=${VITE_AUTH_MODE}
ENV VITE_APP_SYSTEM_CODE=${VITE_APP_SYSTEM_CODE}
ENV VITE_AUTH_API_BASE_URL=${VITE_AUTH_API_BASE_URL}
ENV VITE_AUTH_SERVICE_BASE_URL=${VITE_AUTH_SERVICE_BASE_URL}
ENV VITE_AUTH_SERVICE_LOGIN_URL=${VITE_AUTH_SERVICE_LOGIN_URL}
ENV VITE_AUTH_SERVICE_LOGOUT_URL=${VITE_AUTH_SERVICE_LOGOUT_URL}
ENV VITE_AUTH_SERVICE_CLIENT_ID=${VITE_AUTH_SERVICE_CLIENT_ID}
ENV VITE_AUTH_SERVICE_REDIRECT_URI=${VITE_AUTH_SERVICE_REDIRECT_URI}
ENV VITE_CHAT_AUTH_BASE_URL=${VITE_CHAT_AUTH_BASE_URL}
ENV VITE_CHAT_AUTH_LOGIN_URL=${VITE_CHAT_AUTH_LOGIN_URL}
ENV VITE_CHAT_AUTH_LOGOUT_URL=${VITE_CHAT_AUTH_LOGOUT_URL}
ENV VITE_CHAT_AUTH_CLIENT_ID=${VITE_CHAT_AUTH_CLIENT_ID}
ENV VITE_CHAT_AUTH_REDIRECT_URI=${VITE_CHAT_AUTH_REDIRECT_URI}

WORKDIR /workspace
COPY chat-shared-types ./chat-shared-types
COPY hr-web-client ./hr-web-client

# Build the shared types first so `@hacom/chat-shared-types` resolves its
# `dist/` entrypoints (main/types/exports) during the client's tsc + vite build.
WORKDIR /workspace/chat-shared-types
RUN npm run build
RUN test -f /workspace/chat-shared-types/dist/index.d.ts

WORKDIR /workspace/hr-web-client
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY hr-web-client/deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY hr-web-client/deploy/docker/entrypoint.sh /docker-entrypoint.d/40-inject-env.sh
RUN chmod +x /docker-entrypoint.d/40-inject-env.sh
COPY --from=build /workspace/hr-web-client/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
