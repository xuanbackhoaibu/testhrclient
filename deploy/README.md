# HR Web Develop Deploy

`hr-web-client` owns its own build, image push, and develop deployment. Do not deploy this app from `chat-infrastructure`.

## Runtime Contract

- Compose project: `hr-dev`
- Service: `hr-web-client`
- Image: `ghcr.io/hacom-holding-dx/hr-web-client:${HR_WEB_VERSION}`
- Container port: `80`
- Health (container-internal): `http://127.0.0.1/healthz`
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

Use `env/develop/hr-web-client.env` from the workspace as the server
runtime template. Real secrets must stay on the server or in GitHub secrets.

The smoke check runs health endpoints inside each container via `docker exec`, so
no host-side port binding is required for production deployments.

## Build-Time Variables

The GitHub workflow passes Vite config as Docker build args:

- `VITE_HR_API_BASE_URL` (default `/api/v1` for the HR domain)
- `VITE_HR_USE_MOCKS`
- `VITE_HR_AUTH_MODE`
- `VITE_CHAT_AUTH_BASE_URL`
- `VITE_CHAT_AUTH_LOGIN_URL`
- `VITE_CHAT_AUTH_LOGOUT_URL`
- `VITE_CHAT_AUTH_CLIENT_ID`
- `VITE_CHAT_AUTH_REDIRECT_URI`

This is a Vite static build: `VITE_API_BASE_URL` is baked into the generated
bundle during image build. Changing the server runtime env file after deployment
does not change the browser API base URL for an already-built image.

For the deployed develop environment where HR Web and HR API share the same
reverse proxy, keep `VITE_HR_API_BASE_URL=/api/v1`. The smoke check uses
`docker exec` inside each container and does not require a host-reachable
URL.

For local UI development from a laptop against the server API, do not use `/api`
unless you are testing the temporary legacy alias. Use the canonical absolute
server URL in `.env.local`, for example:

```env
VITE_USE_MOCKS=false
VITE_API_BASE_URL=https://<server-host-or-domain>/api/v1
VITE_CHAT_AUTH_BASE_URL=https://<server-host-or-domain>/api/v1/auth
VITE_CHAT_AUTH_LOGIN_URL=https://<server-host-or-domain>/api/v1/auth/login
VITE_CHAT_AUTH_LOGOUT_URL=https://<server-host-or-domain>/api/v1/auth/logout
VITE_CHAT_AUTH_REDIRECT_URI=http://localhost:5173/auth/callback
```

`VITE_CHAT_AUTH_LOGIN_URL` is the POST endpoint consumed by the HR web login
form. It is not a browser redirect target; `GET /api/v1/auth/login` correctly
returns `NOT_FOUND`.

That mode also requires server-side HR/Auth configuration to allow the local
browser origin and callback, for example `http://localhost:5173` and
`http://localhost:5173/auth/callback`.

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
