# Рефакторинг клиента: слой API — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Отделить имитацию сервера от интерфейса: страницы работают только с контрактом `@/api`, вся имитация лежит в `client/src/api/mock/` и заменяется целиком.

**Architecture:** `api/contract` описывает типы и интерфейс `ApiClient`. `api/mock` реализует его поверх синглтон-хранилища (`localStorage`) и движка бизнес-логики (`mock/engine`, бывший `domain/`). `api/hooks` оборачивает контракт в TanStack Query. Страницы переводятся по одной, приложение собирается после каждой задачи.

**Tech Stack:** React 19, Vite 8, TypeScript 6, Tailwind v4, React Router 7, `@tanstack/react-query` (новая зависимость, утверждена).

**Spec:** `docs/superpowers/specs/2026-11-15-api-layer-refactor-design.md`

## Global Constraints

- Зависимости `@tanstack/react-query` и `vitest` (dev) утверждены разработчиком, других новых зависимостей не добавлять.
- Задержка имитации по умолчанию `150` мс, переменная `VITE_MOCK_LATENCY_MS`.
- Ключи `localStorage` не меняются: `mlt-oblik:db:v1`, `mlt-oblik:user:v1`, `mlt-oblik:theme:v1`. Формат базы внутри имитации не меняется.
- Страницы, компоненты и хуки импортируют только `@/api` (файл `api/index.ts`). Из `@/api/mock/*` импортирует только `api/index.ts`.
- Язык: комментарии в `api/mock/engine/**` на украинском, во всём остальном коде на английском. Идентификаторы английские, тексты интерфейса украинские.
- Файл не длиннее примерно 250–300 строк. Комментарии подробные: у каждого файла шапка «что и зачем», у каждой функции описание, у неочевидных веток причина.
- Бизнес-правила не меняются. Проверку прав в операции движка не добавлять (решение разработчика: права проверяет UI).
- Пагинацию и серверную сортировку не добавлять. Списки возвращаются целиком, но методы принимают параметры фильтра.
- Цвета только через CSS-токены, мобильный дизайн не трогать, внешний вид не менять.
- Коммит делается, только если разработчик попросил. Если не просил, шаг «Контрольная точка» заканчивается проверкой без коммита.
- Тесты (`vitest`, `npm test`) пишутся только для движка `api/mock/engine/**` и демо-данных. Тестов хранилища, хуков, компонентов и e2e нет (решение разработчика). Тесты чистые, без `jsdom`, лежат рядом с кодом как `*.test.ts`, не импортируют ничего из `@/mocks` и `@/domain` (эти папки будут удалены). Для небольших баз в тестах используется `engine/test-utils.ts`. Для переноса логики сначала идёт одноразовая сверка со старым кодом, затем пишутся постоянные тесты (Task 4–6). Остальное проверяется `npm run build`, `npm run lint` и ручным сценарием.
- Тесты проверяют бизнес-правила проекта: минус запрещён везде, корректировка отдельной операцией с отдельным слагаемым в сверке, закрытой считается только «Видано», проверки прав в операции не добавляются.

## Review Focus

Что спецификация подразумевает, но ни одна задача не проверяет сама. Проверка каждого пункта добавлена в задачу-владельца.

1. **Двойной клик на «Створити/Додати».** Из-за задержки 150 мс второй клик проходит до ответа и создаёт дубль закупки или вложения. Ожидание: кнопка заблокирована, пока запрос в полёте, создаётся одна запись (Task 10, 11).
2. **Бизнес-ошибка** (`ok: false`: нет остатка, пустая причина). Ожидание: текст ошибки показан, база и кэш не меняются (Task 11).
3. **Устаревший кэш после записи.** После вложения остаток на складе, сумма заявки, дашборд и журнал обновляются без перезагрузки страницы, в том числе когда запись сделала ещё не переведённая страница (Task 3, 11, 12).
4. **Испорченный или старый `localStorage`** (пустой, битый JSON, нет ключей, старое название «Закрито»). Ожидание: возврат к демо-данным без падения, «Скинути демо-дані» работает (Task 3, 14).
5. **Глубокая ссылка и смена пользователя.** `/orders/<несуществующий id>` показывает загрузку, затем «не знайдено», а не падение. После выхода или смены пользователя права и данные перечитываются, а не берутся из кэша прошлого пользователя (Task 7, 11).

## Карта файлов

```
client/src/
  api/
    index.ts                     публичный вход: api, ApiProvider, хуки, типы контракта
    contract/
      types.ts                   сущности и DTO (бывший domain/types.ts без Db)
      result.ts                  ApiResult<T>
      client.ts                  интерфейс ApiClient и интерфейсы модулей
    hooks/
      query-client.ts            QueryClient, ключи кэша
      api-provider.tsx           QueryClientProvider + подписка на изменения хранилища
      use-session.ts, use-users.ts, use-catalog.ts, use-warehouse.ts,
      use-purchases.ts, use-orders.ts, use-reports.ts, use-audit.ts,
      use-integration.ts, use-settings.ts
    mock/
      index.ts                   собирает ApiClient из handlers
      storage.ts                 синглтон-хранилище Db, localStorage, подписка
      latency.ts                 delay()
      engine/                    бывшие domain/ops.ts, calc.ts, labels.ts, permissions.ts
        types.ts                 Db и внутренние типы
        test-utils.ts            makeDb(...) и билдеры партий, закупок, заявок для тестов
        money.ts, dates.ts, status.ts, permissions.ts, audit.ts,
        fifo.ts, stock.ts, adjust.ts, purchases.ts, allocations.ts,
        catalog.ts, users.ts, integration.ts, reports.ts
        *.test.ts                тесты рядом с каждым файлом движка (см. задачи 4–6, 14)
      handlers/                  по файлу на модуль: auth, users, catalog, warehouse,
                                 purchases, orders, allocations, reports, audit,
                                 integration, settings
      seed/                      index.ts, reference.ts, people.ts, catalog.ts,
                                 orders.ts, scenario.ts
  lib/
    labels.ts                    UI-подписи enum (бывший domain/labels.ts без статусных функций)
    period.ts                    PeriodKey, PERIOD_LABELS, rangeFor
```

Удаляются в Task 16: `src/domain/`, `src/mocks/`, `src/store/db-store.tsx`.

---

### Task 1: Каркас, зависимость, запрет прямых импортов

**Files:**
- Modify: `client/package.json`, `client/eslint.config.js`, `client/src/main.tsx`
- Create: `client/src/api/index.ts`, `client/src/api/hooks/query-client.ts`, `client/src/api/hooks/api-provider.tsx`, `client/src/api/mock/latency.ts`, `client/vitest.config.ts`

**Interfaces:**
- Produces: `delay(): Promise<void>` (ждёт `VITE_MOCK_LATENCY_MS`, по умолчанию 150), `queryClient: QueryClient`, `<ApiProvider>{children}</ApiProvider>`, команда `npm test` (`vitest run`).

- [ ] **Step 1:** В `client/` выполнить `npm install @tanstack/react-query` и `npm install -D vitest`. Версии минимум двухнедельной давности, точно указаны в `package.json`. Добавить скрипт `"test": "vitest run"`.
- [ ] **Step 1a:** Создать `vitest.config.ts` (окружение `node`, `include: ['src/**/*.test.ts']`, `passWithNoTests: true`, алиас `@` на `src`, как в `vite.config.ts`). Убедиться, что `tsc -b` не подхватывает конфиг как приложение (при необходимости добавить в `tsconfig.node.json`).
- [ ] **Step 2:** Создать `latency.ts` с `delay()` и `query-client.ts` с `queryClient` (`retry: false`, `refetchOnWindowFocus: false`, `staleTime: 0`).
- [ ] **Step 3:** Создать `api-provider.tsx` (`QueryClientProvider`), обернуть им приложение в `main.tsx` снаружи `DbProvider`. `api/index.ts` пока экспортирует только `ApiProvider`.
- [ ] **Step 4:** В `eslint.config.js` добавить `no-restricted-imports` с шаблоном `@/api/mock/*` для всех файлов, кроме `src/api/**`, с понятным сообщением «Import from '@/api' only».
- [ ] **Step 5: Проверка.** `npm run build`, `npm run lint` и `npm test` (сообщает, что тестов пока нет, и завершается успешно) проходят. Намеренно добавить в любую страницу импорт из `@/api/mock/latency`: `npm run lint` обязан упасть. Убрать импорт.
- [ ] **Step 6: Контрольная точка.** Приложение открывается и выглядит как раньше.

### Task 2: Контракт: типы и интерфейс ApiClient

**Files:**
- Create: `client/src/api/contract/types.ts`, `result.ts`, `client.ts`
- Modify: `client/src/domain/types.ts` (оставить только `Db`, `SyncSource` и временный `export * from '@/api/contract/types'`)

**Interfaces:**
- Produces: `ApiResult<T = void> = { ok: true; value: T } | { ok: false; error: string }`. `ApiClient` с модулями ниже. Остальные задачи берут имена отсюда.

- [ ] **Step 1:** Перенести в `contract/types.ts` все сущности и enum из `domain/types.ts` кроме `Db`, `Settings`-хранилища и `counters` (они остаются во внутренних типах движка в Task 4). `domain/types.ts` реэкспортирует контракт, чтобы старые импорты продолжали работать.
- [ ] **Step 2:** Описать входные типы: `UserInput`, `UserPatch`, `CategoryInput`, `CategoryPatch`, `SupplierInput`, `SupplierPatch`, `ProductInput`, `ProductPatch`, `CreatePurchaseInput`, `CreatePurchaseResult`, `AddAllocationInput`, `AdjustStockInput { productId; deltaQty; reason }`, `DateRange`, `AnalyticsFilters`, `OrderFilters`, `AuditFilters { range: DateRange }`.
- [ ] **Step 3:** Описать DTO (в каждом хватает полей, чтобы страница ничего не считала сама, поля называет исполнитель по потребностям страницы):
  - `Session { user: User; permissions: Permission[] }`
  - `SupplierRow = Supplier & { purchasesCount: number; purchasesTotalKop: number }`
  - `StockRow` (товар, имя категории, `qty`, `avgPriceKop`, `valueKop`, `inStock`), `ProductDetail` (товар, `StockRow`, партии с поставщиком и датой, история), `FifoPreview { lines; totalKop; shortfall }`, `StockTotals { valueKop; productsInStock: number }`
  - `PurchaseRow`, `PurchaseDetail` (позиции, партии, `status`, `totalKop`, `allocatedKop`, `remainingKop`, `canCancel`, `supplierName`, `createdByName`)
  - `OrderRow` (заявка, `clientName`, `assetTitle`, `typeName`, `statusCode`, `statusLabel`, `locked`, `costKop`, `lastOperationAt`), `OrderDetail` (то же + вложения, история, `costByCategory`)
  - `DashboardData`, `AnalyticsData`, `AuditRow`, `IntegrationStatus`, `Reference { orderTypes; statusMappings; assetTypes }`
- [ ] **Step 4:** В `contract/client.ts` объявить интерфейсы модулей и `ApiClient`. Методы все возвращают `Promise`, записи возвращают `ApiResult`:
  - `AuthApi { me(): Session|null; listDemoUsers(): User[]; login(userId): ApiResult<Session>; logout(): void }`
  - `UsersApi { list(); create(UserInput); update(id, UserPatch) }`
  - `CategoriesApi`, `SuppliersApi` с тем же набором `list/create/update`
  - `WarehouseApi { listStock(); getProduct(id); previewFifo(productId, qty); totals(); createProduct(ProductInput); updateProduct(id, ProductPatch); adjustStock(AdjustStockInput) }`
  - `PurchasesApi { list(); get(id); create(CreatePurchaseInput); cancel(id, reason) }`
  - `OrdersApi { list(OrderFilters); get(id) }`
  - `AllocationsApi { add(AddAllocationInput); release(id, mode, reason?); transfer(id, toOrderId, reason?) }`
  - `ReportsApi { dashboard(DateRange); analytics(AnalyticsFilters) }`
  - `AuditApi { list(AuditFilters) }`
  - `IntegrationApi { status(); sync(SyncSource) }`
  - `SettingsApi { get(); update(patch) }`
  - `ReferenceApi { get() }`
- [ ] **Step 5: Проверка.** `npm run build` и `npm run lint` проходят. Приложение работает как раньше.

### Task 3: Синглтон-хранилище и общий доступ старого и нового кода

**Files:**
- Create: `client/src/api/mock/storage.ts`, `client/src/api/mock/index.ts`
- Modify: `client/src/store/db-store.tsx`, `client/src/api/index.ts`, `client/src/api/hooks/api-provider.tsx`

**Interfaces:**
- Produces в `storage.ts`: `getDb(): Db`, `subscribe(listener: () => void): () => void`, `runOp<T>(fn: (draft: Db) => ApiResult<T>): ApiResult<T>` (клонирует, фиксирует только при `ok`), `mutateDb(fn: (draft: Db) => void): void`, `resetDb(): void`, `getSessionUserId(): string | null`, `setSessionUserId(id: string | null): void`.
- Produces в `mock/index.ts`: `api: ApiClient`, где ещё не переведённые модули заданы через `notMigrated<T>(name)` (Proxy, бросающий ошибку «module X is not migrated»).
- Produces в `api/index.ts`: `export { api }`, `ApiProvider`, типы контракта.

- [ ] **Step 1:** Реализовать `storage.ts` по логике `loadDb`, `apply`, `mutate`, `reset` из текущего `db-store.tsx`: ключ `mlt-oblik:db:v1`, при пустом, битом или неполном JSON возвращать `createSeededDb()` (пока из `@/mocks/seed`). Каждый коммит записывает в `localStorage` в `try/catch` и вызывает слушателей.
- [ ] **Step 2:** Переписать `db-store.tsx` так, чтобы публичный интерфейс `useDb()` (`db, apply, mutate, reset, currentUser, login, logout, has`) остался прежним, но данные брались через `useSyncExternalStore(subscribe, getDb)`, а запись через `runOp`/`mutateDb`. Сессия через `getSessionUserId`/`setSessionUserId`.
- [ ] **Step 3:** `ApiProvider` подписывается на `subscribe` и при любом изменении вызывает `queryClient.invalidateQueries()`. Так запись старой страницы обновляет кэш уже переведённых.
- [ ] **Step 4:** Собрать `mock/index.ts` с `notMigrated` для всех модулей и экспорт `api`.
- [ ] **Step 5: Проверка.** `npm run build`, `npm run lint`. Ручной сценарий: войти, создать закупку, обновить страницу (данные сохранились), «Скинути демо-дані» (вернулись демо-данные). Записать в `localStorage` мусор (`mlt-oblik:db:v1` = `{`) и обновить страницу: приложение открывается с демо-данными.
- [ ] **Step 6: Контрольная точка.**

### Task 4: Движок, часть 1: основа (деньги, даты, статусы, права, аудит, FIFO, склад)

**Files:**
- Create: `client/src/api/mock/engine/{types,money,dates,status,permissions,audit,fifo,stock}.ts`, `engine/test-utils.ts`, `engine/{fifo,stock,status,permissions}.test.ts`

**Interfaces:**
- Produces: `Db` (в `types.ts`, вместе с `counters`, `Settings`-хранилищем, `SyncSource`), `roundQty`, `inRange(iso, range)`, `orderStatusCode(db, raw)`, `orderStatusLabel(db, raw)`, `isOrderLocked(db, raw)`, `ROLE_PERMISSIONS`, `permissionsOf(user)`, `pushAudit(db, input, at?)`, `fifoBatches`, `planFifo`, `productStock`, `totalStockValueKop`. Имена и сигнатуры совпадают со старыми функциями в `domain/`.

- [ ] **Step 1:** Скопировать (не удаляя оригиналы) соответствующие функции из `domain/calc.ts`, `labels.ts`, `permissions.ts`, `ops.ts` (`pushAudit`) в новые файлы с подробными украинскими комментариями. Бизнес-логику не менять. Типы импортировать из `@/api/contract/types`.
- [ ] **Step 2:** Одноразовая сверка: написать вне репозитория (в scratchpad) скрипт для `npx tsx`, который строит `createSeededDb()`, вызывает старые и новые версии `planFifo`, `productStock`, `totalStockValueKop`, `isOrderLocked`, `permissionsOf` для всех товаров, заявок и пользователей и сравнивает результаты через `deepStrictEqual`. Запустить.
- [ ] **Step 3:** Создать `test-utils.ts`: `makeDb(overrides?: Partial<Db>): Db` (пустая валидная база с настройками и справочником статусов `in-queue→inQueue`, `in-progress→inWork`, `ready→done`, `closed→closed`), а также билдеры `makeBatch`, `makeOrder`, `makeProduct`, `makeUser` с разумными значениями по умолчанию.
- [ ] **Step 4: Тесты** (названия и главные утверждения):
  - `fifo.test.ts`: «одна партия покрывает количество», «количество охватывает две партии, у строк разные цены `unitPriceKop`», «партии одной цены дают отдельные строки», «партия с нулевым остатком пропускается», «нехватка даёт `shortfall` и покрывает только имеющееся», «`0.1 + 0.2` списывается без остатка округления», «порядок по `receivedAt`, затем по `id`».
  - `stock.test.ts`: «средняя цена считается по остатку», «при нулевом остатке средняя цена берётся по всей истории партий», «`totalStockValueKop` равна сумме остаток × цена».
  - `status.test.ts`: «`isOrderLocked` истинно только для `closed`», «`ready` не блокирует», «не замапленный статус возвращает `null` и не блокирует».
  - `permissions.test.ts`: «админ имеет все права», «исполнитель имеет `purchases.view`, `purchases.create`, `allocations.create`», «`extraPermissions` добавляются», «заблокированный пользователь и `null` не могут ничего».
- [ ] **Step 5: Проверка.** Скрипт сверки печатает «OK», `npm test`, `npm run build` и `npm run lint` проходят.

### Task 5: Движок, часть 2: операции

**Files:**
- Create: `client/src/api/mock/engine/{adjust,purchases,allocations,catalog,users,integration}.ts`, `engine/{adjust,purchases,allocations}.test.ts`

**Interfaces:**
- Produces: те же операции, что в `domain/ops.ts`, с теми же сигнатурами, но возвращающие `ApiResult`: `createPurchase`, `cancelPurchase`, `addAllocation`, `releaseAllocation`, `transferAllocation`, `adjustStock`, `createProduct`, `updateProduct`, `createSupplier`, `updateSupplier`, `createCategory`, `updateCategory`, `createUser`, `updateUser`, `syncRoApp`. Плюс из `calc.ts`: `purchaseTotalKop`, `purchaseItemTotalKop`, `purchaseBatches`, `itemBatch`, `purchaseAllocatedKop`, `purchaseRemainingKop`, `purchaseStatus`, `canCancelPurchase`, `orderAllocations`, `orderAllocationHistory`, `orderCostKop`, `orderLastOperationAt`, `orderCostByCategory`.

- [ ] **Step 1:** Копировать с разбивкой по файлам (`adjust.ts` берёт `adjustStock`, `integration.ts` берёт `syncRoApp`), украинские комментарии, поведение не менять. Тексты ошибок остаются дословно.
- [ ] **Step 2:** Сверка: скрипт для `npx tsx` берёт `createSeededDb()` дважды, выполняет в одной копии старые операции, в другой новые с одинаковыми входами (закупка на склад и в заявку, вложение со списанием из нескольких партий, возврат, перенос, отмена закупки, корректировка плюс и минус с превышением остатка, закрытая заявка без причины) и сравнивает полученные `Db` (кроме `id` и времени) и результаты `OpResult`. Запустить.
- [ ] **Step 3: Тесты** на `makeDb`. В каждом тесте ошибки (`ok: false`) дополнительно проверяется, что база после вызова глубоко равна копии до вызова (Review Focus 2):
  - `purchases.test.ts`: «закупка на склад создаёт партии без вложений», «закупка в заявку создаёт партию с `qtyRemaining = 0` и одно вложение с той же ценой», «ошибки: нет позиций, нет поставщика, количество 0, цена 0, заявка в статусе `closed`», «отмена возвращает `ok`, если из закупки не списывали», «отмена отклонена, если из закупки уже списывали», «отмена требует непустую причину», «`purchaseStatus` даёт `new`, `partial`, `full`, `cancelled`», «сумма закупки `purchaseTotalKop` равна сумме позиций».
  - `allocations.test.ts`: «вложение списывает по FIFO, `totalKop` равна сумме строк», «количество больше остатка отклоняется», «выданная заявка без причины отклоняется, с причиной проходит», «возврат возвращает количество в те же партии», «отмена возвращает так же, но статус `cancelled`», «перенос не меняет остатки и цены и ставит `transferredFromOrderId`», «перенос из или в выданную заявку требует причину», «каждая операция добавляет запись в `db.audit`».
  - `adjust.test.ts`: «плюс создаёт партию с `adjustment: true`», «минус списывает по FIFO», «минус больше остатка отклоняется с сообщением про отрицательные остатки», «пустая причина отклоняется», «нулевая разница отклоняется».
- [ ] **Step 4: Проверка.** Скрипт сверки печатает «OK», `npm test`, сборка и линт проходят.

### Task 6: Движок, часть 3: отчёты

**Files:**
- Create: `client/src/api/mock/engine/reports.ts`, `engine/reports.test.ts`, `client/src/lib/period.ts`

**Interfaces:**
- Produces в `reports.ts`: `dashboardMetrics(db, range)`, `moneySeries`, `categoryBreakdown`, `allocatedVsStock`, `filteredOrderIds`, `costStats`, `costByAssetType`, `costByEmployee`, `costBySupplier` (из `calc.ts`). В `lib/period.ts`: `PeriodKey`, `PERIOD_LABELS`, `rangeFor(period, custom?)`.

- [ ] **Step 1:** Копировать аналитические функции в `reports.ts`, функции выбора периода в `lib/period.ts` (это UI-часть: она формирует запрос). `DateRange` берётся из контракта.
- [ ] **Step 2:** Сверка скриптом, как в Task 5, для всех периодов (`today`, `week`, `month`, `year`, `all`) и для фильтров аналитики.
- [ ] **Step 3: Тесты** `reports.test.ts` на небольшой базе из `makeDb`: «`dashboardMetrics` считает закупки и вложения за период и не считает отменённые и неактивные», «активные заявки с вложениями исключают только выданные», «`allocatedVsStock` в сумме равна сумме неотменённых закупок периода», «`costStats` на пустом наборе возвращает нули», «`filteredOrderIds` по поставщику, категории и пользователю», «`moneySeries` не теряет пустые дни».
- [ ] **Step 4: Проверка.** «OK», `npm test`, сборка и линт проходят.

### Task 7: Сессия, справочники, настройки, права в UI

**Files:**
- Create: `api/mock/handlers/{auth,settings}.ts` и `reference.ts` (в той же папке), `api/hooks/use-session.ts`, `use-settings.ts`, `use-reference.ts`
- Modify: `App.tsx`, `pages/login-page.tsx`, `pages/settings-page.tsx`, `components/layout/app-shell.tsx`, `components/common/status.tsx`, `api/mock/index.ts`

**Interfaces:**
- Produces: `useSession(): { session: Session | null; isLoading: boolean; can(p: Permission): boolean; login(id); logout() }`, `useSettings()`, `useUpdateSettings()`, `useReference()`.

- [ ] **Step 1:** Реализовать handlers модулей `auth`, `settings`, `reference` через `storage` и движок, каждый метод начинается с `await delay()`.
- [ ] **Step 2:** `useSession` строится на `api.auth.me()`. Смена или выход пользователя сбрасывает весь кэш (`queryClient.clear()`) и перечитывает сессию. `RequireAuth`, `Guard`, `app-shell`, `login-page`, `status.tsx`, `settings-page` переходят с `useDb()` на хуки.
- [ ] **Step 3: Проверка (Review Focus 5).** Сборка и линт проходят. Вручную: войти администратором и исполнителем (у исполнителя нет пунктов «Аналітика», «Користувачі»), выйти и войти под другим (права обновились без перезагрузки). Открыть `/orders/несуществующий` под обычным пользователем: видна загрузка и затем «не знайдено» (если страница заявки ещё не переведена, проверить это в Task 11).

### Task 8: Пользователи, категории, поставщики

**Files:**
- Create: `api/mock/handlers/{users,catalog}.ts`, `api/hooks/use-users.ts`, `use-catalog.ts`
- Modify: `pages/users-page.tsx`, `pages/categories-page.tsx`, `pages/suppliers-page.tsx`, `api/mock/index.ts`

**Interfaces:**
- Produces: `useUsers()`, `useCreateUser()`, `useUpdateUser()`, `useCategories()`, `useCreateCategory()`, `useUpdateCategory()`, `useSuppliers()` (возвращает `SupplierRow[]`), `useCreateSupplier()`, `useUpdateSupplier()`. Мутации возвращают `ApiResult`, успешная мутация инвалидирует свои ключи и ключи журнала.

- [ ] **Step 1:** Handlers: `users` и `catalog` (категории и поставщики), `suppliers.list` считает `purchasesCount` и `purchasesTotalKop`.
- [ ] **Step 2:** Перевести три страницы на хуки, убрать `useDb`, `apply` и импорты из `@/domain`. Кнопки отправки блокируются на время `isPending`.
- [ ] **Step 3: Проверка.** Сборка и линт. Вручную: создать и изменить пользователя, категорию, поставщика, деактивировать поставщика, проверить запись в журнале «Журнал» (ещё не переведён, он читает через старый `db`, данные те же).

### Task 9: Склад и товары

**Files:**
- Create: `api/mock/handlers/warehouse.ts`, `api/hooks/use-warehouse.ts`
- Modify: `pages/inventory-page.tsx`, `components/allocation/allocate-product-dialog.tsx`, `api/mock/index.ts`

**Interfaces:**
- Produces: `useStock()`, `useProduct(id)`, `useFifoPreview(productId, qty)`, `useStockTotals()`, `useCreateProduct()`, `useUpdateProduct()`, `useAdjustStock()`.

- [ ] **Step 1:** Handlers склада: `listStock` (строка на товар с остатком, средней ценой, стоимостью), `getProduct` (партии, поставщик, дата, остаток), `previewFifo`, `totals`, `createProduct`, `updateProduct`, `adjustStock`.
- [ ] **Step 2:** Перевести `inventory-page.tsx` и `allocate-product-dialog.tsx`. Предпросмотр FIFO в диалоге идёт через `useFifoPreview` (с отложенным вводом количества, чтобы не слать запрос на каждую цифру).
- [ ] **Step 3: Проверка.** Сборка и линт. Вручную: корректировка плюс и минус, минус больше остатка показывает ошибку и ничего не меняет, поповнення, «Розподілити» со списанием из двух партий (видны две строки FIFO), стоимость склада на странице совпадает с дашбордом.

### Task 10: Закупки

**Files:**
- Create: `api/mock/handlers/purchases.ts`, `api/hooks/use-purchases.ts`
- Modify: `pages/purchases-page.tsx`, `pages/purchase-detail-page.tsx`, `pages/purchase-new-page.tsx`, `api/mock/index.ts`

**Interfaces:**
- Produces: `usePurchases()`, `usePurchase(id)`, `useCreatePurchase()`, `useCancelPurchase()`.

- [ ] **Step 1:** Handlers: `list` и `get` отдают DTO с `totalKop`, `status`, `allocatedKop`, `remainingKop`, `canCancel`, `supplierName`, `createdByName`.
- [ ] **Step 2:** Перевести три страницы. Расчёты `purchaseTotalKop` и подобные из страниц убираются, берутся из DTO. Итог формы закупки (сумма введённых позиций до сохранения) остаётся локальным расчётом UI на `lib`-функции, а не вызовом движка.
- [ ] **Step 3: Проверка (Review Focus 1).** Сборка и линт. Вручную: создать закупку на склад, дважды быстро щёлкнув «Зберегти»: создаётся ровно одна (кнопка блокируется). Отменить неиспользованную закупку, попытаться отменить использованную (понятная ошибка).

### Task 11: Заявки и вложения

**Files:**
- Create: `api/mock/handlers/{orders,allocations}.ts`, `api/hooks/use-orders.ts`
- Modify: `pages/orders-page.tsx`, `pages/order-detail-page.tsx`, `components/allocation/add-allocation-dialog.tsx`, `api/mock/index.ts`

**Interfaces:**
- Produces: `useOrders(filters?)`, `useOrder(id)`, `useAddAllocation()`, `useReleaseAllocation()`, `useTransferAllocation()`. Диалог вложения использует также `useFifoPreview`, `useStock`, `useCreateProduct`, `useCreatePurchase` из прежних задач.

- [ ] **Step 1:** Handlers: `orders.list` отдаёт `OrderRow` с `costKop`, `lastOperationAt`, `statusLabel`, `locked`. `orders.get` отдаёт `OrderDetail` с вложениями, историей и разбивкой по категориям. Вложения: `add`, `release`, `transfer`.
- [ ] **Step 2:** Перевести страницы и диалог. Страница заявки показывает скелетон при загрузке и «не знайдено» при `null`.
- [ ] **Step 3: Проверка (Review Focus 1, 2, 3, 5).** Сборка и линт. Вручную: добавить вложение дважды быстрым щелчком (одно вложение); количество больше остатка (ошибка, остаток не изменился); вложение в выданную заявку без причины (ошибка) и с причиной под администратором; возврат, перенос между заявками; после вложения остаток на складе, сумма заявки и дашборд обновились без перезагрузки; `/orders/неверный` не падает.

### Task 12: Дашборд, аналитика, журнал

**Files:**
- Create: `api/mock/handlers/{reports,audit}.ts`, `api/hooks/use-reports.ts`, `use-audit.ts`
- Modify: `pages/dashboard-page.tsx`, `pages/analytics-page.tsx`, `pages/audit-page.tsx`, `components/common/period-filter.tsx`, `components/common/charts.tsx`, `api/mock/index.ts`

**Interfaces:**
- Produces: `useDashboard(range)`, `useAnalytics(filters)`, `useAudit(range)`. `period-filter.tsx` и страницы импортируют `PeriodKey`, `rangeFor`, `PERIOD_LABELS` из `@/lib/period`, а `NamedValue`, `SeriesPoint` из `@/api`.

- [ ] **Step 1:** Handlers отчётов и журнала. Журнал фильтрует по периоду на стороне «сервера», `AuditRow` содержит имя пользователя.
- [ ] **Step 2:** Перевести три страницы и два общих компонента.
- [ ] **Step 3: Проверка (Review Focus 3).** Сборка и линт. Вручную: числа на дашборде и в аналитике те же, что до рефакторинга для периода «Весь час» (сравнить с состоянием до задачи: «Вартість залишків», суми закупок и вкладень). Смена периода показывает загрузку и новые данные.

### Task 13: Интеграция RO App

**Files:**
- Create: `api/mock/handlers/integration.ts`, `api/hooks/use-integration.ts`
- Modify: `pages/integration-page.tsx`, `pages/orders-page.tsx` (кнопка обновления), `api/mock/index.ts`

**Interfaces:**
- Produces: `useIntegrationStatus()`, `useSync()` (мутация с параметром `SyncSource`).

- [ ] **Step 1:** Handler `integration.status` (последняя синхронизация, журнал, настройки вебхука), `sync` вызывает `syncRoApp` из движка.
- [ ] **Step 2:** Перевести обе страницы.
- [ ] **Step 3: Проверка.** Сборка и линт. Вручную: «Оновити зараз», имитация вебхука меняет статус заявки, в журнале интеграции появляется запись с источником. Убедиться, что `notMigrated` больше нигде не используется (`mock/index.ts` без этого вызова) и ни один файл вне `src/api` не импортирует `@/domain`, кроме подлежащих удалению shim-файлов.

### Task 14: Демо-данные по сущностям

**Files:**
- Create: `api/mock/seed/{index,reference,people,catalog,orders,scenario}.ts`, `api/mock/engine/invariants.test.ts`, `api/mock/seed/seed.test.ts`
- Modify: `api/mock/storage.ts` (импорт из `./seed`)
- Delete: `client/src/mocks/seed.ts`

**Interfaces:**
- Produces: `createSeededDb(): Db` (тот же результат, что раньше, в `seed/index.ts`).

- [ ] **Step 1:** Разбить `mocks/seed.ts` (449 строк): справочники статусов и типов в `reference.ts`, пользователи и клиенты в `people.ts`, товары, категории, поставщики в `catalog.ts`, заявки и техника в `orders.ts`, сценарий закупок и вложений через операции движка в `scenario.ts`. Подробные комментарии, украинские для данных-движка.
- [ ] **Step 2:** Сверка скриптом `npx tsx`: старый (из git: `git show HEAD:client/src/mocks/seed.ts` во временный файл) и новый `createSeededDb()` дают равные `Db` кроме полей id и времени, либо с зафиксированным временем.
- [ ] **Step 3: Тесты инвариантов.** Общая функция `assertInvariants(db)` в `invariants.test.ts` проверяет: «ни у одной партии `qtyRemaining < 0`», «сверка: сумма `qtyRemaining × unitPriceKop` по партиям неотменённых закупок плюс по партиям с `adjustment: true` равна `totalStockValueKop`», «у каждой партии `qtyRemaining ≤ qtyReceived`», «для активных вложений сумма строк равна `totalKop` и ссылается на существующие партии». Тест «случайная последовательность»: детерминированный генератор (простая функция `mulberry32(seed)` в самом тесте, без зависимостей), 300 шагов на `createSeededDb()` из случайных допустимых операций (закупка на склад, закупка в заявку, вложение, возврат, отмена вложения, перенос, корректировка плюс и минус, отмена закупки), после каждого шага `assertInvariants`, плюс «цены `unitPriceKop` существующих партий не изменились», «число записей `db.allocations` и `db.audit` не уменьшилось». Прогнать с тремя разными seed.
- [ ] **Step 4: Тест демо-данных.** `seed.test.ts`: «`createSeededDb()` проходит `assertInvariants`», «есть заявка с не замапленным статусом `on-hold`», «есть выданная заявка и заявка в статусе `ready`», «есть отменённая закупка».
- [ ] **Step 5: Проверка (Review Focus 4).** `npm test`, сборка и линт. «Скинути демо-дані» возвращает рабочую демо-базу, битый `localStorage` восстанавливается. В списке статусов заявки названа «Видано», заявка `on-hold` остаётся не замапленной.

### Task 15: Разбивка больших файлов

**Files:**
- Modify/Create: по результату замеров.

**Interfaces:** внутренние компоненты и функции, публичные пути страниц не меняются.

- [ ] **Step 1:** Замерить `wc -l` по `client/src`. Файлы длиннее примерно 300 строк (ожидаемо `inventory-page.tsx`, `order-detail-page.tsx`, `add-allocation-dialog.tsx`, `purchase-new-page.tsx`, `integration-page.tsx`) разбить на страницу-композицию и компоненты рядом (`pages/inventory/…`, `components/allocation/…`), сложные обработчики вынести в хуки и функции.
- [ ] **Step 2:** Подробные комментарии на английском: шапка файла «что и зачем», описание каждого компонента и хука, причины неочевидных решений.
- [ ] **Step 3: Проверка.** Сборка и линт. Полный ручной проход по всем страницам: ни одна не изменила внешний вид и поведение. Ни один файл заметно не превышает порог.

### Task 16: Удаление старого кода и документы

**Files:**
- Delete: `client/src/domain/`, `client/src/store/db-store.tsx`, `client/src/mocks/`
- Modify: `client/eslint.config.js` (запретить также `@/domain/*`), `CLAUDE.md` (добавить `npm test` в команды `client/`), `client/README.md`, `docs/04-frontend-status.md`, `docs/02-spec.md` (журнал изменений), `docs/03-backend-plan.md` (раздел 5)

- [ ] **Step 1:** Проверить поиском, что в `client/src` нет импортов `@/domain`, `@/store/db-store`, `@/mocks`. Удалить папки.
- [ ] **Step 2:** `npm run build`, `npm run lint`, `npm test`. Любое падение исправить до продолжения.
- [ ] **Step 3:** Обновить документы: `CLAUDE.md` (раздел «Client architecture»: слой `api`, папка `api/mock` как единственная заменяемая часть, хуки, `ApiResult`), `client/README.md` (структура и правила), `docs/04-frontend-status.md` (текущая архитектура, шаг 12 плана превращается в «написать `api/http` по контракту»), `docs/03-backend-plan.md` раздел 5 (что уходит на сервер: `api/mock/engine/*`, контракт `api/contract/*` служит спецификацией эндпоинтов), строка в журнал изменений `docs/02-spec.md`.
- [ ] **Step 4: Итоговая проверка.** Полный ручной проход: вход тремя пользователями, закупка на склад и в заявку, вложение, возврат, перенос, выданная заявка с причиной, корректировка, отмена закупки, дашборд, аналитика, журнал, интеграция, сброс демо-данных, переключение темы и мобильного режима.
- [ ] **Step 5: Контрольная точка.** Приложение полностью работает, замена `api/mock` на `api/http` не требует правок вне `api/`.
