# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project in one paragraph

**MLT Облік** is an internal system for a repair service center. It reads repair orders from RO App (read-only) and tracks purchases, warehouse batches and allocations of materials to orders, so each repair gets a reliable cost price. It does not replace RO App and does not manage repairs. The client prototype is done on mock data; the NestJS server is still the starter.

## Read these first (`docs/`)

- `docs/README.md`: reading order.
- `docs/01-idea.md`: idea, decisions, post-spec changes.
- `docs/02-spec.md`: the full spec (v1.1). Source of requirements.
- `docs/03-backend-plan.md`: backend modules, invariants, step-by-step plan.
- `docs/04-frontend-status.md`: what the client does now, pending fixes, what moves to the server.
- `docs/05-source-description.md`: original developer description (reference only).

Docs are in Russian, the UI is Ukrainian. If a requirement is unclear, ask the developer instead of guessing.

## How to work in this repo

- **The developer writes the server himself.** Default to planning, explaining, reviewing and answering questions for `server/`. Write server code only when asked, and then in small, reviewable pieces following `docs/03-backend-plan.md`.
- Client changes are fine to implement directly, but follow the client rules below.
- Keep `docs/` current: when a decision changes, update `docs/02-spec.md` (add a line to its changelog) and the other docs it affects.

## Repository layout

Two independent npm projects with no root `package.json` or workspace. Run `npm install` in each one.

- `client/`: React 19 + Vite + TypeScript prototype ("stage 1" per `client/README.md`). There is no backend. All data lives in the browser's `localStorage`.
- `server/`: NestJS 12 app. It is still the default starter (`AppController` returns "Hello World!"). The business logic has not been moved here yet. Target stack: NestJS, PostgreSQL, Prisma, REST, JWT.
- `docs/`: spec, plan and decisions (see above).

## Commands

`client/` (no test runner is configured):
- `npm run dev`: Vite dev server
- `npm run build`: `tsc -b && vite build`. The type check is part of the build.
- `npm run lint`: ESLint over the whole project
- `npm run preview`

`server/`:
- `npm run start:dev`: `nest start --watch`
- `npm run build` then `npm run start:prod`
- `npm test`: unit tests (`**/*.spec.ts`)
- Single unit test: `npx vitest run src/app.controller.spec.ts`, or `npx vitest run -t "<test name>"`
- `npm run test:e2e`: runs `test/**/*.e2e-spec.ts` with `vitest.config.e2e.ts`
- `npm run lint`: oxlint with type-aware rules, `src/` and `test/`
- `npm run format`: Prettier

## Client architecture

- Entry: `main.tsx` → `App.tsx`. `App.tsx` defines the routes and two guards. `RequireAuth` redirects to `/login`. `Guard` takes a permission and renders `NoAccess` when it is missing.
- Providers: `DbProvider` (`store/db-store.tsx`) holds the whole `Db` object as one React state. It is persisted under the `mlt-oblik:db:v1` key. `UiProvider` (`store/ui-store.tsx`) holds theme, mobile mode, and toasts.
- Writes go through one of two functions on `DbProvider`:
  - `apply(fn)` runs an operation from `domain/ops.ts` on a `structuredClone` draft and commits only if the result is `ok`. Use it for any business operation that can fail.
  - `mutate(fn)` makes an unchecked change, for settings and similar cases.
- `src/domain/` is pure TypeScript with no React. It holds `types.ts` (data model), `permissions.ts` (role plus `extraPermissions`; `can()` returns false for blocked users), `calc.ts` (FIFO, stock, cost), `ops.ts` (every mutating operation), and `labels.ts`. Each op in `ops.ts` appends an `AuditEntry` through `pushAudit`.
- `mocks/seed.ts` builds the demo database by calling the same ops the UI uses, so demo data follows the real rules. The "reset demo data" button is in Settings.
- Mobile mode: `UiProvider.forceMobile` shows a 390px phone frame for demos. `isNarrow` is set below 768px. `MOBILE_NAV_ITEMS` in `components/layout/nav.ts` is the two-section navigation for masters.
- Styling: Tailwind v4 through `@tailwindcss/postcss`. Colors come only from CSS tokens in `src/index.css` (light and dark), never hex values in components. The UI primitives in `components/ui` are hand-written in shadcn style, without Radix.

## Business invariants

These rules are enforced in `domain/`, so keep them when changing code there. The full list is in `client/README.md`, which is written in Ukrainian.

- Money is stored as integer kopecks, in fields named `*Kop`. Quantities are rounded with `roundQty`.
- Write-offs use FIFO. The oldest batches go first, and each allocation line keeps the price of its own batch. A batch's price never changes after it is received.
- Purchase totals and allocation totals are never added together. A purchase is not an expense.
- Negative stock is forbidden. The only exception is a manual `inventory.adjust`, which requires a reason.
- Financial records are never deleted. Use cancel, return, or adjust instead.
- Changing allocations on a closed order requires the `allocations.edit_closed` permission and a reason.

## Decisions that override older assumptions

- "Unallocated" and "in stock" are the same thing. There is no unallocated page or separate unallocated price. The Inventory page has a per-product "Розподілити" button; price comes from FIFO.
- A purchase created on the "Нова закупівля" page always goes to the warehouse. A purchase straight into an order is created only from the allocation dialog inside an order.
- Colors come only from the CSS tokens built on the six-color palette `#06141B #11212D #253745 #4A5C6A #9BA8AB #CCD0CF`. Dark theme is the default.
- Only cost price is shown in analytics (no margin). RO App is read-only, never written to.
- Mobile design is to be redone later; do not invest in polishing it before the developer asks.

## Language

UI strings, domain comments, and the README are in Ukrainian. Identifiers, commits, and code comments outside `domain/` are in English. Keep this split.

## Server notes

- The intended direction, per `client/README.md`, is to move `client/src/domain` into NestJS almost unchanged.
- The server uses NodeNext ESM, so relative imports need a `.js` extension (`./app.module.js`). The `tsconfig` paths are resolved in tests by `vitest.config*.ts` via `resolve.tsconfigPaths`.
- Production observability goes to NestJS Observe, which is not wired in yet. `server/AGENTS.md` describes the setup (`npx @nestjs/observe link`). When a task depends on production behavior, use the Observe MCP data described there rather than only the code.
