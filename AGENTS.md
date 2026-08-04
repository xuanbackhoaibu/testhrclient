# Repository Guidelines

## Project Structure & Module Organization

This is a React + Vite + TypeScript HRM web client. Application entrypoints live in `src/main.tsx`, `src/app/App.tsx`, `src/app/router.tsx`, and `src/app/providers.tsx`. Feature-owned API clients, hooks, and types are under `src/features/<domain>/`, for example `src/features/employees/` and `src/features/imports/`. Route pages live in `src/pages/`, layouts in `src/layouts/`, shared UI and utilities in `src/shared/`, and mock data in `src/shared/mocks/`. Static files belong in `public/`; built output in `dist/` is generated and should not be edited.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite dev server, usually at `http://localhost:5173`.
- `npm run build`: run TypeScript project build and create the production Vite bundle.
- `npm run lint`: run ESLint over the repository.
- `npm run preview`: serve the built bundle locally for smoke testing.

Use `.env.example` as the local configuration template. `VITE_USE_MOCKS=true` runs the app without backend services; `false` expects `chat-auth-service` and `hr-api-service`.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Keep files domain-oriented: `employeesApi.ts`, `employeeTypes.ts`, `useEmployees.ts`, and page components such as `EmployeesPage.tsx`. Prefer PascalCase for components and types, camelCase for functions and variables, and `useXxx` for hooks. Follow the existing two-space JSX indentation style and avoid broad cross-feature imports when a shared helper belongs in `src/shared/`.

Formatting is enforced through ESLint flat config in `eslint.config.js`, including TypeScript, React Hooks, and React Refresh rules. Run `npm run lint` before handing off changes.

## Testing Guidelines

No test runner is currently configured. For now, verify changes with `npm run lint`, `npm run build`, and a manual smoke test in mock mode. When adding tests, colocate them near the feature or page they cover and use clear names such as `EmployeesPage.test.tsx` or `useEmployees.test.ts`.

## Commit & Pull Request Guidelines

The current history only shows an initial commit, so no detailed project convention is established yet. Use concise, imperative commit subjects such as `Add employee import validation` or `Fix auth callback handling`. Pull requests should include a short summary, affected routes or modules, environment assumptions, verification commands, and screenshots for visible UI changes.

## Business Rules That Must Not Be "Fixed" Back

**Reset mật khẩu nhân sự (chốt 04/08/2026) — đừng đổi sang mật khẩu ngẫu nhiên.**
Nút "Reset mật khẩu" ở drawer *Xem tài khoản* (`src/features/employees/AccountDetailDrawer.tsx`)
phải đưa tài khoản **về mật khẩu mặc định của công ty** (`Hacomholdings@88`), đúng bằng mật khẩu
lúc cấp tài khoản mới. Lý do: HR bàn giao một mật khẩu thống nhất, không phải chép từng chuỗi
random khác nhau cho từng người.

- Frontend gửi `useDefaultPassword: true`, **không hardcode** giá trị mật khẩu.
- Mật khẩu mặc định do backend giữ: `chat-auth-service` → `config.hrProvisioning.defaultEmployeePassword`.
  Muốn đổi thì sửa đúng một chỗ đó.
- Sinh ngẫu nhiên (`autoGenerate`) chỉ dành cho màn quản trị nâng cao `src/pages/accounts/AccountsPage.tsx`,
  nơi admin chủ động chọn — **không** dùng cho drawer nói trên.
- Hành vi được khoá bằng test ở `chat-auth-service/src/tests/` (`hr-auth-admin-account-status.test.ts`,
  `password-validation-rules.test.ts`). Đổi sang random là test đỏ ngay.

## Security & Configuration Tips

Do not add real secrets to `.env` or committed files. Authentication is delegated to `chat-auth-service`; this client should not call `POST /auth/login` on `hr-api-service`. Keep bearer-token handling centralized through the existing auth and HTTP client modules.
