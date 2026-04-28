# AGENTS.md

## Scope

This file applies to `hr-web-client`.

Parent/root `AGENTS.md` defines global multi-repo rules. This file adds stricter rules for the HACOM HRM web client.

If there is a conflict:

1. Security and personal-data protection rules win.
2. Backend source-of-truth rules win.
3. Auth integration rules win.
4. HR API contract rules win.
5. UI stability and operator usability rules win.
6. This repo-level file wins over generic workspace style rules.

---

## Repository Role

`hr-web-client` is the React + Vite + TypeScript web client for HACOM HRM.

It owns:

- HRM web UI
- HR route pages
- HR layout and navigation
- Employee list/search/detail UI
- Employee import UI
- HR workflow UI where implemented
- Auth/session UI integration
- API client integration with `hr-api-service`
- Frontend form validation
- Loading, empty, error, forbidden, and mock-mode states

It does not own:

- HR employee truth
- auth/session/token truth
- RBAC truth
- chat user truth
- backend authorization decisions
- import persistence truth
- personal-data access policy

Backend APIs are authoritative. The UI must display backend state accurately and must not invent hidden truth.

---

## Project Structure

Application entrypoints:

- `src/main.tsx`
- `src/app/App.tsx`
- `src/app/router.tsx`
- `src/app/providers.tsx`

Feature-owned code:

- `src/features/<domain>/`

Examples:

- `src/features/employees/`
- `src/features/imports/`

Feature folders may contain:

- API clients
- hooks
- feature-local types
- feature-local components
- feature-local helpers

Route pages:

- `src/pages/`

Layouts:

- `src/layouts/`

Shared UI and utilities:

- `src/shared/`

Mock data:

- `src/shared/mocks/`

Static files:

- `public/`

Generated production output:

- `dist/`

Do not edit generated `dist/` files.

---

## Build, Test, and Development Commands

Install dependencies:

```bash
npm install
```

Run local Vite dev server, usually at `http://localhost:5173`:

```bash
npm run dev
```

Build production bundle:

```bash
npm run build
```

Run ESLint:

```bash
npm run lint
```

Preview built bundle locally:

```bash
npm run preview
```

There is currently no test runner configured.

Required local verification baseline:

```bash
npm run lint
npm run build
```

For UI changes, also do a manual smoke test in browser.

Before using any command, inspect `package.json`. Do not invent scripts.

---

## Environment Rules

Use:

```text
.env.example
```

Important environment behavior:

```text
VITE_USE_MOCKS=true   -> run app without backend services
VITE_USE_MOCKS=false  -> expect chat-auth-service and hr-api-service
```

Local UI development does not require running `hr-api-service` on your machine.
Set `VITE_USE_MOCKS=false` and point Vite at the server APIs with absolute URLs:

```env
VITE_API_BASE_URL=https://<server-host-or-domain>/api/v1
VITE_CHAT_AUTH_BASE_URL=https://<server-host-or-domain>/api/v1/auth
VITE_CHAT_AUTH_LOGIN_URL=https://<server-host-or-domain>/api/v1/auth/login
VITE_CHAT_AUTH_LOGOUT_URL=https://<server-host-or-domain>/api/v1/auth/logout
VITE_CHAT_AUTH_REDIRECT_URI=http://localhost:5173/auth/callback
```

`VITE_CHAT_AUTH_LOGIN_URL` is a JSON API endpoint. The HR login form calls it
with `POST`; do not navigate the browser to that URL because `GET
/api/v1/auth/login` is not a supported auth route.

Use `VITE_API_BASE_URL=/api/v1` for a deployed build that is served behind the
same reverse proxy as HR API. `/api` is only a temporary backend compatibility
alias for older bundles and should not be used for new builds.

When using server APIs from local dev, the server-side HR/Auth configuration
must allow the local browser origin and callback, for example
`http://localhost:5173` and `http://localhost:5173/auth/callback`.

Rules:

- Do not commit real `.env` files.
- Do not commit secrets.
- Document new environment variables in `.env.example`.
- Keep mock mode local/demo only.
- Do not rely on mock mode for server-test or production behavior.
- Do not hard-code production API URLs in source code.
- Keep API base URLs centralized in config/http client modules.
- Do not scatter environment reads across random components.

---

## Source-of-Truth Boundaries

### HR truth belongs to `hr-api-service`

`hr-api-service` owns canonical truth for:

- employees
- employee code
- HR full name
- HR email
- department
- unit
- position
- employment status
- import results
- leave/attendance records where implemented
- HR audit behavior

Frontend rules:

- Do not create client-only HR truth.
- Do not treat mock data as real truth.
- Do not infer saved employee state before backend confirms it.
- Do not silently overwrite backend fields with local form state.
- Do not store long-lived employee truth in localStorage.

### Auth truth belongs to `chat-auth-service`

`chat-auth-service` owns:

- login
- session
- token
- current user
- account status
- auth/RBAC claims where designed

Frontend rules:

- Do not call `POST /auth/login` on `hr-api-service`.
- Authentication must go through the existing auth integration.
- Bearer-token handling must remain centralized.
- Do not trust role, permission, user ID, employee code, or department from localStorage alone.
- Backend must enforce authorization.
- Frontend route guards are UX helpers, not security.

---

## Auth and Session Rules

Auth/session handling must be centralized.

Rules:

- Keep token handling inside the existing auth and HTTP client modules.
- Do not manually attach tokens in random components.
- Do not duplicate auth state across multiple stores.
- Do not keep stale user/permission state after logout.
- Logout must clear sensitive local state and relevant caches.
- Expired session must show a clear state and recover cleanly.
- Forbidden access must not be shown as generic error.
- Disabled/invalid account state must be handled distinctly if backend exposes it.

Required UI states where relevant:

- unauthenticated
- loading session
- expired session
- forbidden
- backend unavailable
- mock mode active
- invalid token/session

---

## API Client Rules

API integration must be typed and centralized.

Rules:

- Keep API clients inside feature folders or shared HTTP client modules.
- Do not call `fetch`/Axios ad hoc from visual components.
- Keep response parsing and error mapping in API/client helpers.
- Preserve backend response shapes.
- Preserve pagination/filter/sort contracts.
- Preserve request IDs where backend returns them.
- Do not silently swallow API errors.
- Do not turn all errors into vague “failed” messages.
- Do not infer success from UI mutation before backend confirms it.
- Do not send fields backend does not expect.

When HR API contract changes, update:

1. API client types.
2. Feature hooks.
3. Page state handling.
4. Form validation.
5. Mock data.
6. Manual smoke checklist.
7. Tests if a test runner is added.

API errors should distinguish where possible:

- unauthenticated
- forbidden
- validation failure
- duplicate employee code
- duplicate email
- not found
- conflict
- import validation failed
- partial import failed
- backend unavailable
- internal error

---

## Mock Mode Rules

Mock mode exists for local/demo development only.

Rules:

- `VITE_USE_MOCKS=true` must be visually or operationally clear where useful.
- Mock data must not contain real personal data.
- Mock behavior should match backend contracts closely.
- Do not implement product-only behavior that exists only in mocks.
- Do not hide missing backend integration behind mock success.
- When backend contract changes, update mocks to match.
- Do not use mock auth in shared/server-test/production environments.

Mock mode should support smoke testing, not replace backend contract testing.

---

## HR Personal Data Rules

HR data is sensitive.

Sensitive fields may include:

```text
CCCD
phone number
date of birth
address
personal email
emergency contact
salary fields if added later
```

Rules:

- Do not log sensitive personal data.
- Do not store sensitive personal data in localStorage.
- Do not put sensitive data in URL query params.
- Do not expose sensitive fields to unauthorized roles.
- Mask sensitive fields where appropriate.
- Copy-to-clipboard actions for sensitive fields must be intentional.
- Do not display raw backend errors that include personal data.
- Screenshots/recordings in PRs must avoid real personal data.

---

## Employee UI Rules

Employee UI must reflect backend truth.

Rules:

- Employee list must use backend pagination/filter/search.
- Do not load all employees into frontend memory for normal search.
- Employee code must be treated as a stable HR identifier, not auth user ID.
- Linked auth user must be shown as linked account state, not HR truth.
- HR email and auth email must be visually distinguished if both exist.
- Employment status must be displayed clearly.
- Department/unit/position should follow backend naming and IDs.
- Editing an employee must preserve unsaved form state on failed submit.
- Save success must be shown only after backend confirms it.
- Conflict errors must be shown clearly.

Important display fields may include:

```text
employeeCode
fullName
email
department
unit
position
employmentStatus
linkedUser
updatedAt
```

Do not show stale or mock-only fields as canonical production data.

---

## Employee Search and Table Rules

HR tables must be stable and bounded.

Rules:

- Use backend pagination.
- Use backend sorting where supported.
- Use backend filtering where supported.
- Debounce search input where appropriate.
- Preserve filter/sort/page state where useful.
- Avoid N+1 API calls per row.
- Keep column widths stable.
- Long text must truncate or wrap intentionally.
- Use detail drawers/modals for secondary information.
- Empty search state must be clear.
- Loading skeletons must reserve realistic space.
- Do not shift layout when data loads.
- Do not render unbounded large employee arrays.

Table interactions should handle:

- loading
- empty
- empty search
- error
- forbidden
- pagination
- sorting
- filtering
- row action loading
- mutation success/failure

---

## Import UI Rules

Employee import is high-risk.

Rules:

- Validate file type and basic shape before upload where possible.
- Do not show import success until backend confirms.
- Show row-level validation errors when backend provides them.
- Show summary counts clearly:
  - created
  - updated
  - skipped
  - failed
  - invalid
  - duplicate

- Preserve import result after failure so the user can inspect it.
- Do not auto-commit destructive imports without confirmation.
- Large imports must show progress or clear processing state.
- Do not display real import files in committed mock/sample data.
- Do not keep uploaded HR files in browser state longer than needed.
- Do not log import file contents.

Import UX should make it clear whether the user is in:

- preview mode
- validation failed
- ready to commit
- importing
- partially completed
- completed
- failed

---

## Forms and Mutation Rules

Forms must be safe and predictable.

Rules:

- Validate before submit.
- Surface field-level errors.
- Preserve input on failed submit.
- Disable duplicate submit while pending.
- Show backend validation errors clearly.
- Do not hide validation errors only in toast messages.
- Confirm destructive actions.
- Roll back optimistic UI after failed mutation.
- Do not submit unchanged sensitive fields as blank overwrite.
- Do not silently drop backend-returned fields that matter to the user.

Common mutation states:

```text
idle
dirty
submitting
success
validation_error
conflict
failed
```

---

## Route and Layout Rules

HRM layout must be stable.

Rules:

- Route guards must handle auth loading explicitly.
- Do not flash protected HR data before auth check completes.
- Do not create redirect loops.
- Preserve useful query params for list/search pages.
- Do not put sensitive data in URL.
- 403/404/error pages must be production-grade, not placeholders.
- Sidebar/header/content layout must remain stable under resize.
- Responsive behavior must not shift core navigation unexpectedly.

Required states where applicable:

- 403 forbidden
- 404 not found
- generic error
- backend unavailable
- unauthenticated
- empty table
- empty search
- import failed
- validation failed
- mock mode notice

---

## State Management Rules

Separate server state from local UI state.

Server state:

- current auth user
- permissions/roles from backend/auth contract
- employee lists
- employee details
- department/unit/position lists
- import results
- leave/attendance data where implemented

Local UI state:

- open modal/drawer
- selected tab
- selected rows
- draft form values
- temporary filter input
- table density
- import file selection
- local loading indicators

Rules:

- Do not duplicate server state across multiple stores.
- Keep local state close to the component when possible.
- Prefer feature hooks for data access.
- Mutations must refresh, patch, or invalidate affected data consistently.
- Failed mutations must not leave UI in fake success state.
- Do not keep sensitive employee data in persistent browser storage.
- Avoid render-path allocations that cause table rerender churn.

---

## UI / UX Production Rules

Avoid AI-slop UI.

Rules:

- Prefer clean, serious, production HRM layout.
- Prioritize table clarity and workflow efficiency.
- Avoid random gradients, oversized cards, decorative dashboards, and noisy empty widgets.
- Keep spacing, typography, borders, and density consistent.
- Use tooltips for secondary explanation.
- Error states must be actionable.
- Empty states must be concise.
- Loading skeletons must reserve realistic layout space.
- Modals/drawers must not cause layout jumps.
- HR admin pages should look like an internal production tool, not a generated demo.

---

## Accessibility Rules

Rules:

- Preserve keyboard navigation.
- Preserve visible focus states.
- Buttons/icons need accessible names.
- Forms need labels and useful validation messages.
- Modals/drawers must trap focus and restore focus on close.
- Tables should remain readable by assistive tech where practical.
- Do not remove semantic HTML for styling convenience.
- Color contrast must remain readable.

---

## Styling Rules

Use existing styling architecture.

Rules:

- Keep shared UI in `src/shared/`.
- Do not introduce a second design system without explicit approval.
- Avoid one-off magic pixel values in core layout.
- Keep layout tokens consistent.
- Long text must not break tables or cards.
- Use responsive rules intentionally.
- Do not put broad global CSS changes in a feature bugfix unless required.

---

## Coding Style and Naming

Use:

- TypeScript
- React function components
- two-space JSX indentation
- ESLint flat config from `eslint.config.js`
- React Hooks rules
- React Refresh constraints

Naming:

- Components: `PascalCase`
- Types: `PascalCase`
- Functions/variables: `camelCase`
- Hooks: `useXxx`
- Feature API files: `employeesApi.ts`
- Feature type files: `employeeTypes.ts`
- Feature hooks: `useEmployees.ts`
- Page components: `EmployeesPage.tsx`

Rules:

- Prefer domain-oriented files.
- Prefer feature-local helpers.
- Move truly shared helpers to `src/shared/`.
- Avoid broad cross-feature imports.
- Keep visual components separate from API mapping.
- Avoid large components that mix API calls, form logic, and table rendering.
- Avoid unnecessary `useEffect`.
- Avoid `any` in API payloads and HR data types.

---

## Testing Guidelines

No test runner is currently configured.

Current required verification:

```bash
npm run lint
npm run build
```

Also perform a manual smoke test in mock mode:

```text
VITE_USE_MOCKS=true
```

Manual smoke checklist for visible changes:

- app starts
- auth/mock state works
- main route loads
- employee list loads
- employee search/filter works where relevant
- form submit states behave correctly
- import page states behave correctly where relevant
- forbidden/error/empty states look acceptable
- layout is stable under resize

When adding tests later:

- colocate tests near feature/page
- use clear names such as:
  - `EmployeesPage.test.tsx`
  - `useEmployees.test.ts`
  - `EmployeeImportPage.test.tsx`

- prefer Testing Library for user-visible behavior
- cover API adapters, route guards, forms, tables, and import states

Add tests for:

- employee list rendering
- empty employee table
- employee search/filter
- employee form validation
- duplicate/conflict handling
- import validation result rendering
- auth guard behavior
- forbidden state
- backend error state
- mock mode behavior

---

## Performance Rules

Hot paths:

- employee list rendering
- employee search
- import preview/result rendering
- forms with many fields
- department/unit/position dropdowns
- large tables

Rules:

- Avoid rendering unbounded lists.
- Use pagination.
- Debounce search where appropriate.
- Cancel stale requests where supported.
- Avoid expensive formatting in table render loops.
- Memoize heavy column definitions where useful.
- Do not rerender the whole layout on each table filter change.
- Avoid storing large import files/results in unnecessary global state.
- Avoid blocking the main thread with heavy file parsing if async handling is needed.

---

## Security Rules

- Never commit secrets.
- Never commit real `.env` files.
- Never commit real HR datasets.
- Never log tokens, cookies, authorization headers, or personal data.
- Never trust frontend-only authorization.
- Do not store sensitive employee data in localStorage.
- Do not put sensitive fields in URL query params.
- Do not use `dangerouslySetInnerHTML` unless reviewed and sanitized.
- Do not execute untrusted import file content.
- Do not bypass CORS/auth behavior with unsafe client hacks.
- Do not call auth endpoints through HR API if auth ownership belongs to `chat-auth-service`.

---

## Documentation Rules

Update docs or README notes when changing:

- env variables
- mock mode behavior
- auth integration behavior
- HR API integration behavior
- employee table/search behavior
- import workflow behavior
- route behavior
- deployment assumptions

Docs must describe current implementation, not aspirational behavior.

---

## Commit and Pull Request Guidelines

Use concise imperative subjects.

Preferred style:

```text
feat(employees): add employee import preview
fix(auth): handle expired session state
test(imports): cover row validation errors
docs(env): document VITE_USE_MOCKS
refactor(employees): centralize employee API adapter
```

PRs should include:

- summary
- affected routes/modules
- API contract impact
- auth integration impact
- environment assumptions
- screenshots or recordings for visible UI changes
- verification commands
- manual smoke result
- backend dependency notes

---

## Change Safety Checklist

Before completing a change, verify:

- HR truth remains in `hr-api-service`.
- Auth remains delegated to `chat-auth-service`.
- No client-only HR truth was introduced.
- Bearer-token handling remains centralized.
- Mock mode does not hide production behavior.
- Sensitive personal data is not logged or persisted unsafely.
- Employee tables remain paginated/bounded.
- Import states are clear and safe.
- Forms preserve input on failure.
- Error/empty/forbidden states are handled.
- Env examples are updated when config changed.
- Lint/build were run or failures were reported honestly.
- Manual smoke testing was done for visible UI changes.

---

## Definition of Done

An `hr-web-client` change is not done until:

- It fixes the root cause, not only the symptom.
- It preserves backend source-of-truth ownership.
- It does not create hidden client HR truth.
- It authenticates through `chat-auth-service`.
- It does not call login on `hr-api-service`.
- It keeps bearer-token handling centralized.
- It protects sensitive HR personal data.
- It handles loading, empty, error, forbidden, and mock-mode states where relevant.
- It keeps employee/import UI stable and production-grade.
- It avoids AI-slop UI.
- It preserves API contracts or updates affected clients/mocks.
- It passes lint/build or failures are clearly reported.
- Docs/env examples are updated when behavior changed.
