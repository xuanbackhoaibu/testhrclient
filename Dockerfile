ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
ARG VITE_API_BASE_URL=/api
ARG VITE_USE_MOCKS=false
ARG VITE_AUTH_MODE=chat-auth
ARG VITE_CHAT_AUTH_BASE_URL=/api/v1/auth
ARG VITE_CHAT_AUTH_LOGIN_URL=/api/v1/auth/login
ARG VITE_CHAT_AUTH_LOGOUT_URL=/api/v1/auth/logout
ARG VITE_CHAT_AUTH_CLIENT_ID=hr-web-client
ARG VITE_CHAT_AUTH_REDIRECT_URI=/auth/callback

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_USE_MOCKS=${VITE_USE_MOCKS}
ENV VITE_AUTH_MODE=${VITE_AUTH_MODE}
ENV VITE_CHAT_AUTH_BASE_URL=${VITE_CHAT_AUTH_BASE_URL}
ENV VITE_CHAT_AUTH_LOGIN_URL=${VITE_CHAT_AUTH_LOGIN_URL}
ENV VITE_CHAT_AUTH_LOGOUT_URL=${VITE_CHAT_AUTH_LOGOUT_URL}
ENV VITE_CHAT_AUTH_CLIENT_ID=${VITE_CHAT_AUTH_CLIENT_ID}
ENV VITE_CHAT_AUTH_REDIRECT_URI=${VITE_CHAT_AUTH_REDIRECT_URI}

WORKDIR /app
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
