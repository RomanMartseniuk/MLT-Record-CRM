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
- `docs/06-server-status.md`: **server work in progress**: where it stopped, the next step, developer decisions that override the plan, and how to set up a new machine. Read it first when continuing server work.

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

`client/`:
- `npm run dev`: Vite dev server
- `npm run build`: `tsc -b && vite build`. The type check is part of the build.
- `npm run lint`: ESLint over the whole project
- `npm test`: Vitest unit tests for the mock server engine and the demo data (`src/**/*.test.ts`)
- Single test file: `npx vitest run src/api/mock/engine/fifo.test.ts`
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
- **The API layer (`src/api`) is the only way pages get or change data.** Pages and components import only from `@/api` (an ESLint rule forbids importing `@/api/mock/*` from outside `src/api`). They never see the database object.
  - `api/contract/`: the contract. `types.ts` (entities), `dto/*.ts` (request inputs and response view models, already computed by the server: totals, statuses, display names, "locked" flags), `client.ts` (the `ApiClient` interface, one sub-interface per backend module), `result.ts` (`ApiResult<T>`: a business-rule violation is `{ ok: false, error }`, not an exception), `constants.ts` (role → permission table, `EMPTY_FILTER`).
  - `api/hooks/`: TanStack Query hooks (`useStock`, `useCreatePurchase`, …). Each mutation invalidates exactly the cached data it may have changed (`invalidate.ts`, keys in `keys.ts`); there is no global "refetch everything" shortcut. `lib/use-single-flight.ts` protects write handlers from a double click (do not rely on `isPending`: it updates asynchronously).
  - `api/active-client.ts`: **the one swap point** between the mock and a real server.
  - `api/mock/`: everything that simulates the server, replaceable as a whole. `storage.ts` (singleton `Db` in `localStorage`, `runOp` clones and commits only on `ok`), `handlers/*` (implement `ApiClient`, add latency, resolve the acting user), `engine/*` (the business logic, ported almost unchanged from the former `domain/`: FIFO, stock, purchases, allocations, adjustments, reports, permissions, audit; each mutating op appends an audit entry via `pushAudit`), `seed/*` (the demo database, replayed through the same engine ops so it obeys the real rules).
- To connect the real server: write an HTTP implementation of `ApiClient` (e.g. `api/http/`) and export it from `api/active-client.ts`. Nothing outside `src/api` changes.
- `UiProvider` (`store/ui-store.tsx`, hook in `store/ui-context.ts`) holds theme, mobile mode, and toasts. UI-only helpers live in `src/lib` (`format`, `labels`, `period`, `utils`).
- The mock latency is 150 ms by default (`VITE_MOCK_LATENCY_MS`), so missing loading and disabled-button states show up before the real server is connected.
- Mobile mode: `UiProvider.forceMobile` shows a 390px phone frame for demos. `isNarrow` is set below 768px. `MOBILE_NAV_ITEMS` in `components/layout/nav.ts` is the two-section navigation for masters.
- Styling: Tailwind v4 through `@tailwindcss/postcss`. Colors come only from CSS tokens in `src/index.css` (light and dark), never hex values in components. The UI primitives in `components/ui` are hand-written in shadcn style, without Radix.

## Business invariants

These rules are enforced in `api/mock/engine/`, so keep them when changing code there (the tests in `engine/*.test.ts`, especially `invariants.test.ts`, check them). The full list is in `client/README.md`, which is written in Ukrainian.

- Money is stored as integer kopecks, in fields named `*Kop`. Quantities are rounded with `roundQty`.
- Write-offs use FIFO. The oldest batches go first, and each allocation line keeps the price of its own batch. A batch's price never changes after it is received.
- Purchase totals and allocation totals are never added together. A purchase is not an expense.
- Negative stock is forbidden everywhere, with no exceptions. Manual `inventory.adjust` can add or remove stock with a reason, but never below zero.
- Financial records are never deleted. Use cancel, return, or adjust instead.
- Changing allocations on a closed order requires the `allocations.edit_closed` permission and a reason. An order is closed only in the status "Видано" (local `closed`); "Готово" does not lock it. Statuses come only from RO App; the system never changes them.
- A manual adjustment ("Коригування") is its own operation, not a purchase. Its batch (`adjustment: true`) belongs to no purchase; the reconciliation "purchases ↔ warehouse" adds it as a separate term.

## Decisions that override older assumptions

- "Unallocated" and "in stock" are the same thing. There is no unallocated page or separate unallocated price. The Inventory page has a per-product "Розподілити" button; price comes from FIFO.
- A purchase created on the "Нова закупівля" page always goes to the warehouse. A purchase straight into an order is created only from the allocation dialog inside an order.
- Colors come only from the CSS tokens built on the six-color palette `#06141B #11212D #253745 #4A5C6A #9BA8AB #CCD0CF`. Dark theme is the default.
- Only cost price is shown in analytics (no margin). RO App is read-only, never written to.
- Mobile design is to be redone later; do not invest in polishing it before the developer asks.

## Language

UI strings, comments inside `api/mock/engine/` (the business logic that will move to the server), and the client README are in Ukrainian. Identifiers, commits, and code comments everywhere else are in English. Keep this split.

## Server notes

- The intended direction is to move `client/src/api/mock/engine` into NestJS almost unchanged, with its tests. `client/src/api/contract` (`client.ts` and `dto/*`) is the specification of the REST endpoints. `api/mock/engine/integration.ts` (`syncRoApp`) is a simulation and is NOT ported: it is replaced by a real RO App client.
- The server uses NodeNext ESM, so relative imports need a `.js` extension (`./app.module.js`). The `tsconfig` paths are resolved in tests by `vitest.config*.ts` via `resolve.tsconfigPaths`.
- Production observability goes to NestJS Observe, which is not wired in yet. `server/AGENTS.md` describes the setup (`npx @nestjs/observe link`). When a task depends on production behavior, use the Observe MCP data described there rather than only the code.
