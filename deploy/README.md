# HR Web Develop Deploy

`hr-web-client` owns its own build, image push, and develop deployment. Do not deploy this app from `chat-infrastructure`.

## Runtime Contract

- Compose project: `hr-dev`
- Service: `hr-web-client`
- Image: `ghcr.io/hacom-holding-dx/hr-web-client:${HR_WEB_VERSION}`
- Host port: `127.0.0.1:${HR_WEB_HOST_PORT:-3400}`
- Container port: `80`
- Health: `${HR_WEB_HEALTH_URL:-http://127.0.0.1:3400/healthz}`
- External network: `${CHAT_NETWORK}`, currently expected to be `chat-platform`
- No DB, Redis, Mongo, Kafka, MinIO, or chat service is created by this compose file.

## Required Server Files

Create the deploy root and runtime env folder separately:

```text
/hdd3/apps/hr/apps/hr-web-client
/hdd3/apps/hr/env/develop/hr-web-client.env
```

Set GitHub variable `SERVER_RUNTIME_ENV_FILE` to:

```text
/hdd3/apps/hr/env/develop/hr-web-client.env
```

Use `env/server-test/hr-web-client.env` from the workspace as the server
runtime template. Real secrets must stay on the server or in GitHub secrets.

## Build-Time Variables

The GitHub workflow passes Vite config as Docker build args:

- `VITE_HR_API_BASE_URL`
- `VITE_HR_USE_MOCKS`
- `VITE_HR_AUTH_MODE`
- `VITE_CHAT_AUTH_BASE_URL`
- `VITE_CHAT_AUTH_LOGIN_URL`
- `VITE_CHAT_AUTH_LOGOUT_URL`
- `VITE_CHAT_AUTH_CLIENT_ID`
- `VITE_CHAT_AUTH_REDIRECT_URI`

## Deploy

```bash
SERVER_RUNTIME_ENV_FILE=/hdd3/apps/hr/env/develop/hr-web-client.env \
HR_WEB_ENV_FILE=/hdd3/apps/hr/env/develop/hr-web-client.env \
docker compose -p hr-dev --env-file /hdd3/apps/hr/env/develop/hr-web-client.env --env-file /hdd3/apps/hr/env/develop/.hr-web-client.versions -f deploy/compose/develop.yml pull hr-web-client

SERVER_RUNTIME_ENV_FILE=/hdd3/apps/hr/env/develop/hr-web-client.env \
HR_WEB_ENV_FILE=/hdd3/apps/hr/env/develop/hr-web-client.env \
docker compose -p hr-dev --env-file /hdd3/apps/hr/env/develop/hr-web-client.env --env-file /hdd3/apps/hr/env/develop/.hr-web-client.versions -f deploy/compose/develop.yml up -d --no-deps --wait hr-web-client
```

Or:

```bash
HR_WEB_VERSION=<git-sha> deploy/scripts/deploy-develop.sh
```

## Rollback

Rollback is a redeploy of a previous immutable image tag:

```bash
HR_WEB_VERSION=<previous-git-sha> deploy/scripts/deploy-develop.sh
```

No rollback command should remove volumes, recreate infra containers, or change chat network/project names.
