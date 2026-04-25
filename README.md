# hr-web-client

Frontend Phase 1 for HACOM HRM.

This repo is a React + Vite web client for the HR Core Platform demo surface:

- employee master
- legal entity
- org unit
- position
- movement and lifecycle
- contract metadata
- leave
- attendance
- onboarding and offboarding
- import batch
- audit log
- dashboard

Important auth rule:

- The frontend does not log in to HRM backend with username or password.
- The frontend does not call `POST /auth/login` of `hr-api-service`.
- User authentication goes through `chat-auth-service`.
- After getting an access token from `chat-auth-service`, the frontend calls `hr-api-service` with Bearer token.
- The frontend calls `GET /auth/me` on `hr-api-service` to load HRM profile, roles, and data scopes.

## Stack

- React
- Vite
- TypeScript
- React Router
- TanStack Query
- Ant Design
- Axios
- Dayjs
- Zustand

## Install

```bash
npm install
```

## Run local

```bash
npm run dev
```

Default local URL: `http://localhost:5173`

## Build

```bash
npm run build
```

## Environment variables

Copy `.env.example` to `.env` and adjust:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_USE_MOCKS=true

VITE_AUTH_MODE=chat-auth
VITE_CHAT_AUTH_BASE_URL=http://localhost:4000
VITE_CHAT_AUTH_LOGIN_URL=http://localhost:4000/login
VITE_CHAT_AUTH_LOGOUT_URL=http://localhost:4000/logout
VITE_CHAT_AUTH_CLIENT_ID=hr-web-client
VITE_CHAT_AUTH_REDIRECT_URI=http://localhost:5173/auth/callback
```

## Mock mode

When `VITE_USE_MOCKS=true`:

- `/login` shows mock login
- Demo roles: `HR Admin`, `Manager`, `Employee`
- Dashboard, employees, organization, workflows, imports, and audit logs run on mock data
- No backend is required

## Real chat-auth mode

When `VITE_USE_MOCKS=false`:

- `/login` shows `Login with Chat Auth`
- Frontend redirects to `VITE_CHAT_AUTH_LOGIN_URL`
- `AuthCallbackPage` handles token from query or hash
- Then the frontend calls `GET /auth/me` on HR API
- If `/auth/me` returns `401`, session is cleared and the app goes back to `/login`
- If `/auth/me` returns `403`, the app shows: `Tai khoan da xac thuc nhung chua duoc cap quyen HRM.`

This repo does not call `POST /auth/login` of HRM backend.

## Run with hr-api-service

1. Start `chat-auth-service`
2. Start `hr-api-service`
3. Set:
   - `VITE_USE_MOCKS=false`
   - `VITE_API_BASE_URL` to HR API
   - `VITE_CHAT_AUTH_LOGIN_URL` and `VITE_CHAT_AUTH_LOGOUT_URL` to the real chat-auth-service
4. Run `npm run dev`

## Demo flow

1. Login mock HR Admin
2. View dashboard
3. View organization
4. View employees
5. Create employee
6. View employee detail
7. Create leave request
8. Approve leave
9. Import CSV
10. View audit logs

## Known limitations

- Real chat-auth callback contract may need small adjustments to match the live service
- Real HR API endpoints are currently a skeleton client and may need alignment with the final backend contract
- Payroll is not included
- Multi-level workflow approvals are not included
- Document upload is not included
- AI assistant is not included
