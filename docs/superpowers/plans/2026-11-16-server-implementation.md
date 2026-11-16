# Сервер MLT Облік: пошаговый план разработки

> **Для разработчика.** Сервер ты пишешь сам: это практика по NestJS. План разбит на задачи по 2–8 часов, у каждой есть цель, что ты в ней учишь, точные файлы, сигнатуры, проверка «готово» и источник для порта в клиенте. Код тел функций здесь не пишется (кроме трёх мест, где алгоритм неочевиден). Claude здесь ревьюер: после каждой задачи можно показать дифф и спросить «что не так». Чекбоксы `- [ ]` для себя.

**Goal:** REST-сервер `/api/v1`, который реализует контракт `client/src/api/contract` (`ApiClient`) и все инварианты учёта, так что клиент переключается с мока на сервер заменой одного экспорта.

**Architecture:** NestJS 12 (ESM, NodeNext) модульный монолит, PostgreSQL + Prisma. Бизнес-логика склада и денег идёт в одной транзакции с блокировкой партий. Чистые функции (FIFO, округление, права, статусы) портируются из `client/src/api/mock/engine` почти без изменений вместе с тестами. Отчёты портируются тем же способом: читаем таблицы в плоскую структуру `Db` и запускаем функции движка.

**Tech Stack:** NestJS 12, Prisma + PostgreSQL, `@nestjs/config`, `@nestjs/jwt` + `@nestjs/passport` (или свой guard), `class-validator` + `class-transformer`, `bcryptjs`, `@nestjs/schedule`, `@nestjs/throttler`, Vitest + supertest (уже стоят).

**Spec:** `docs/02-spec.md` (требования), `docs/03-backend-plan.md` (инварианты), `client/src/api/contract/*` (форма запросов и ответов), `client/src/api/mock/engine/*` (правила).

## Global Constraints

- Префикс всех маршрутов `/api/v1`. Вебхук RO App `POST /api/v1/integration/webhook`.
- Деньги: **целые копейки** в полях `*Kop` (`Int`), UAH. Количество: `Decimal(12,2)` в БД, на границе сервиса конвертируется в `number` и округляется `roundQty` (2 знака).
- Наружу идут ровно те поля, что в `client/src/api/contract/types.ts` и `dto/*` (имена, типы, ISO-даты). Вьюмодели (имена, суммы, `locked`, `canCancel`) считает сервер.
- Нарушение бизнес-правила: сервис бросает `DomainError(message)`, фильтр отдаёт **HTTP 422** `{ statusCode: 422, message: "<украинский текст>" }`. Транзакция откатывается сама. Ошибки валидации DTO 400, нет токена 401, нет права 403, нет сущности на `GET /x/:id` 404. Тексты ошибок для пользователя на украинском (как в движке).
- Отрицательный остаток запрещён везде. Цена партии не меняется. Списание только FIFO. Финансовые записи не удаляются (cancel, return, adjust). Закупка не равна расходу, их суммы не складываются.
- Закрытая заявка = только статус «Видано» (локальный `closed`). Её вложения правятся только с `allocations.edit_closed` и причиной. Заявка с неизвестным статусом не закрыта.
- Запись в аудит делается **внутри той же транзакции**, что и операция.
- В RO App ничего не пишется, токен RO App только на сервере.
- NodeNext ESM: относительные импорты с `.js` (`./app.module.js`). Комментарии в портированных файлах движка остаются украинскими, в остальном коде английскими. Идентификаторы английские.
- Файл до ~250 строк. Модуль = папка `src/<module>/` со своими controller, service, dto, mapper.
- Коммит после каждой задачи (`server: <что>`), маленькими кусками.

## Review Focus

Что ТЗ подразумевает, но легко не проверить. Тест на каждый пункт лежит в задаче-владельце.

1. **Дробные количества:** партии 0.1 и 0.2, вложение 0.3 списывает обе ровно в ноль (не `0.00000000000000004`). → Task 3, 9.
2. **Параллельные запросы:** два одновременных вложения последней единицы: одно успешно, второе 422, остаток 0, не минус. → Task 12.
3. **Заблокированный пользователь с ещё живым токеном** получает 401 на следующем запросе (guard перечитывает пользователя из БД, права не берутся из токена). → Task 5.
4. **Неизвестный статус RO App:** заявка не падает и не считается закрытой, статус попадает в `unmappedStatuses`. → Task 10, 11.
5. **Пустые данные:** dashboard и аналитика на пустой БД и на периоде без операций дают нули, а не `NaN` и не 500. → Task 10.
6. **Атомарность закупки с новым товаром:** если закупка отклонена, «сирота»-товар не остаётся. → Task 8.

---

## Задачи в Jira (проект MLT «MLT Облік»)

Эпик: **MLT-1** «Сервер MLT Облік». Каждая задача плана заведена как Task под эпиком, в описании: зачем, что сделать, источники в клиенте, критерии «готово когда».

| Task плана | Jira | Тема |
|---|---|---|
| 0 | MLT-2 | Окружение и точка отсчёта |
| 1 | MLT-3 | Каркас, конфиг, ошибки, /health |
| 2 | MLT-4 | Схема БД, миграция, seed |
| 3 | MLT-5 | Доменное ядро (порт с тестами) |
| 4 | MLT-6 | Аудит и счётчик номеров |
| 5 | MLT-7 | Auth, пользователи, права |
| 6 | MLT-8 | Каталог |
| 7 | MLT-9 | Склад |
| 8 | MLT-10 | Закупки |
| 9 | MLT-11 | Заявки и вложения |
| 10 | MLT-12 | Отчёты и журнал |
| 11 | MLT-13 | Интеграция RO App |
| 12 | MLT-14 | Тесты инвариантов и гонок |
| 13 | MLT-15 | Подключение клиента (`api/http`) |
| 14 | MLT-16 | Hardening |
| 15 | MLT-17 | Документация |

---

## Карта файлов (во что превратится `server/src`)

```
src/
  main.ts                     bootstrap: prefix, pipes, filter, CORS, Swagger
  app.module.ts               собирает модули
  config/env.ts               валидация переменных окружения
  common/
    prisma/prisma.service.ts  PrismaService, хелпер транзакции
    errors/domain-error.ts    DomainError + http-exception.filter.ts
    audit/audit.service.ts    record(tx, entry)
    counter/counter.service.ts  next(tx, 'purchase') -> number
    money/                    (см. domain/)
  domain/                     ЧИСТАЯ логика без Nest и Prisma (порт из engine, с тестами)
    money.ts  fifo.ts  permissions.ts  status.ts  format.ts
  contract/                   КОПИЯ client/src/api/contract (types.ts, dto/*, constants.ts)
  auth/  users/  catalog/  warehouse/  purchases/  orders/
  allocations/  reports/  integration/  settings/
prisma/schema.prisma  prisma/seed.ts
test/                         e2e (*.e2e-spec.ts) + helpers
docker-compose.yml  .env.example
```

Сокращение против `03-backend-plan.md` ради скорости: `categories + suppliers + products` = один модуль `catalog` (как `engine/catalog.ts`), `settings + reference` лежат рядом с `integration`, `audit` read-часть в `reports`. Границу «модули денег не пишут в таблицы друг друга» сохраняем: `purchases` и `allocations` зовут методы `WarehouseService`, а не `prisma.batch.*` напрямую.

## Критический путь и что можно отложить

Нужно для первого подключения фронта: Tasks 0 → 1 → 2 → 3 → 5 → 6 → 7 → 8 → 9 → 10 → 11(без cron и вебхука) → 13 (подключение).
Откладывается без потери функциональности (делай после): вебхук и ночной cron (Task 11, шаги 7–8), idempotency и rate limit (Task 12), экспорт XLSX/CSV/PDF, refresh-токен, загрузка фото чека, Swagger, Observe.

Оценка времени (учёба включена): ~55–70 часов на критический путь, ~15 часов на отложенное.

---

## Принять до Task 0 (рекомендации, можно сказать «ок»)

| Вопрос | Рекомендация | Почему |
|---|---|---|
| Деньги | `Int` копейки | уже так в клиенте и движке, нет Decimal в арифметике. Суммы агрегатов в SQL приходят как `bigint`: переводи в `number` в маппере |
| Количество | `Decimal(12,2)` + `roundQty` до 2 знаков на границе (решение разработчика: до сотых, было 3). Правка клиента: `roundQty` в engine, тесты, демо-данные | точность в БД, а чистые функции остаются на `number` |
| ID | `String @default(uuid())` | контракт использует строки |
| Токены | access JWT 8 ч + refresh-токен на 30 дней (решение разработчика). Refresh хранится в БД хешем, ротация при обновлении, отзыв при выходе и блокировке. Переезжает из S14 в S5 | вход не слетает месяц, а украденный токен можно отозвать |
| Хеш пароля | `bcryptjs` | чистый JS, без нативной сборки на Windows |
| Пароль при создании пользователя | сервер сам генерирует пароль и один раз отдаёт его в ответе создания (клиент показывает админу). Пользователь меняет его сам: `POST /auth/change-password`. Флаг `mustChangePassword` у пользователя. Админ может сбросить пароль (новый сгенерированный). Правка клиента: диалог показывает пароль, форма смены пароля. Делает Claude | в контракте пароля нет, нечем входить; ручной ввод админом не нужен |
| Права для справочников (в ТЗ их нет) | чтение: любой вошедший. Создание и правка категорий, поставщиков, товаров: `purchases.create` (мастер создаёт товар в закупке). Блокировка/деактивация: `inventory.manage` | минимально достаточно, подтверди |
| Список ошибок | 422 + `message` | клиентский `api/http` превратит в `{ ok:false, error }` |
| Авторство времени | всё в UTC (`timestamptz`), клиент форматирует | |

---

## Task 0: Окружение и точка отсчёта

**Чему учишься:** запуск проекта, Docker/Postgres, переменные окружения.

**Files:**
- Create: `server/docker-compose.yml`, `server/.env.example`, `server/.env` (в `.gitignore`)

- [ ] **Step 1: Проверь, что стартер жив.** Из `server/`: `npm install`, `npm test`, `npm run test:e2e`, `npm run lint`. Ожидание: всё зелёное. Это же проверка, что Vitest корректно собирает декораторы и DI (если `Test.createTestingModule` падает на «can't resolve dependencies», пиши `@Inject(Token)` явно в конструкторах и скажи Claude).
- [ ] **Step 2: Postgres.** В PATH `docker` не нашёлся (проверял в bash). Варианты: поставить Docker Desktop и `docker-compose.yml` с `postgres:16`, порт 5432, volume; либо локальный установщик PostgreSQL; либо бесплатная облачная БД (Neon/Supabase). Нужны **две** базы: `mlt` и `mlt_test` (e2e).
- [ ] **Step 3: `.env.example`**: `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN=8h`, `PORT=3000`, `CORS_ORIGIN=http://localhost:5173`, `ROAPP_TOKEN=`, `ROAPP_WEBHOOK_SECRET=`. Скопируй в `.env`.
- [ ] **Step 4: Держи под рукой клиент.** `cd client && npm run dev` и пройди по страницам, чтобы видеть, что именно должен отдавать сервер. Открой `client/src/api/contract/client.ts`: это твой список эндпоинтов.
- [ ] **Commit:** `server: add docker compose and env example`

**Готово когда:** `npm test` и `npm run test:e2e` зелёные, `psql`/GUI подключается к обеим БД.

---

## Task 1: Каркас, конфиг, ошибки

**Чему учишься:** `ConfigModule`, глобальные pipes, exception filters, `main.ts`, structure модулей.

**Files:**
- Create: `src/config/env.ts`, `src/common/errors/domain-error.ts`, `src/common/errors/http-exception.filter.ts`, `src/health/health.controller.ts`
- Modify: `src/main.ts`, `src/app.module.ts`; Delete: `src/app.controller.ts`, `src/app.service.ts`, `src/app.controller.spec.ts`, `test/app.e2e-spec.ts` (заменишь на health-тест)
- Test: `test/health.e2e-spec.ts`

**Interfaces:**
- Produces: `class DomainError extends Error { constructor(message: string) }`; `function fail(message: string): never` (бросает `DomainError`); `validateEnv(raw: Record<string, unknown>): Env`.

- [ ] **Step 1: Failing e2e** `GET /api/v1/health` → 200 `{ status: 'ok' }`; `GET /api/v1/nope` → 404.
- [ ] **Step 2: Run:** `npm run test:e2e` — FAIL.
- [ ] **Step 3:** `ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })`: обязательные `DATABASE_URL`, `JWT_SECRET` (≥16 символов); падать на старте с понятным текстом.
- [ ] **Step 4:** В `main.ts`: `app.setGlobalPrefix('api/v1')`, `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`, `app.enableCors({ origin: CORS_ORIGIN })`, `app.enableShutdownHooks()`. Тест-хелпер `createTestApp()` в `test/helpers/app.ts`, который применяет то же самое (иначе e2e не повторит прод).
- [ ] **Step 5:** `DomainError` + `@Catch(DomainError)` фильтр → 422 `{ statusCode, message }`. Остальные `HttpException` оставь стандартными. Unit-тест фильтра.
- [ ] **Step 6: Run** тесты — PASS. **Commit:** `server: bootstrap config, validation, error filter, health`

**Готово когда:** `/api/v1/health` отвечает, неизвестный env валит старт с понятной ошибкой.

---

## Task 2: Схема БД, миграция, PrismaService, seed

**Чему учишься:** Prisma schema, миграции, индексы, seed.

> **Prisma-версия.** В `package.json` Prisma ещё нет. Перед установкой открой актуальный гайд «Prisma + NestJS» (в 7-й версии нужны `prisma.config.ts`, driver adapter `@prisma/adapter-pg` и генерация клиента в свою папку). Не копируй из старых туториалов. Если что-то не стартует, покажи ошибку Claude.

**Files:**
- Create: `prisma/schema.prisma`, `prisma.config.ts` (если требует версия), `src/common/prisma/prisma.service.ts`, `src/common/prisma/prisma.module.ts` (`@Global`), `prisma/seed.ts`
- Test: `test/schema.e2e-spec.ts`

**Interfaces:**
- Produces: `PrismaService extends PrismaClient` с `onModuleInit/onModuleDestroy`; `type Tx = Prisma.TransactionClient`; `PrismaService.inTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T>` (обёртка над `$transaction` с `timeout: 15000`).

- [ ] **Step 1: Модели.** Опиши в `schema.prisma` (поля = контракт, плюс служебные):
  - `User`: id, fullName, email `@unique`, passwordHash, role (enum `admin|executor`), extraPermissions `String[]`, blocked `Boolean`, roAppName?
  - `Category`: id, name, kind (enum `product|expense`), parentId?, active
  - `Supplier`: id, name, contact?, phone?, email?, address?, comment?, active
  - `Product`: id, name, categoryId, unit (enum `pcs|l|kg|m`, в API отдавай `шт|л|кг|м` через маппер), photoTone `Int`, links `Json`, active
  - `Purchase`: id, number `@unique`, date, supplierId, docNumber?, comment?, hasReceipt, destination (enum), orderId?, cancelled, cancelReason?, createdById, createdAt
  - `PurchaseItem`: id, purchaseId, productId, qty `Decimal(12,3)`, unitPriceKop `Int`, note?
  - `Batch`: id, productId, purchaseId?, purchaseItemId?, qtyReceived, qtyRemaining `Decimal(12,3)`, unitPriceKop `Int`, receivedAt, adjustment `Boolean @default(false)`. **Индекс** `@@index([productId, receivedAt, id])` под FIFO, `@@index([purchaseId])`.
  - `Allocation`: id, orderId, productId, qty, totalKop `Int`, createdAt, createdById, status (enum `active|returned|cancelled`), reason?, transferredFromOrderId?. Индексы `[orderId]`, `[productId]`.
  - `AllocationLine`: id, allocationId, batchId, qty, unitPriceKop.
  - `Client`: id, externalId `@unique`, isOrganization, name, phones `String[]`, email?
  - `Asset`: id, externalId `@unique`, title, type, brand, model, modification?
  - `OrderType`: id, externalId `@unique`, name
  - `Order`: id, externalId `@unique`, number, rawStatus, typeId, createdAt, dueDate, doneAt?, closedAt?, clientId, assetId, managerName, engineerName, malfunction, managerNotes?, engineerNotes?, accessories?, syncedAt
  - `StatusMapping`: raw `@id`, local (enum `inQueue|inWork|done|closed`)?, label
  - `AuditLog`: id, at, userId, action `String`, objectType, objectId, objectLabel, before?, after?, reason?. Индекс `[at]`, `[objectType, objectId]`.
  - `SyncLog`: id, at, source (enum), ok, added, updated, message?
  - `Setting`: единственная строка (`id Int @id @default(1)`): orgName, currency, timeZone, dateFormat, nightlySyncTime, webhookUrl, webhookEnabled
  - `Counter`: key `@id`, value `Int` (для номеров закупок `З-0001`)
  - `Expense`: заготовка из ТЗ 4.8 (сумма, категория, дата, автор, orderId?, comment). Только модель, без кода.
- [ ] **Step 2:** `prisma migrate dev --name init`. Открой Prisma Studio, убедись, что таблицы есть.
- [ ] **Step 3:** `PrismaService` + `inTx`. Failing-тест `schema.e2e-spec.ts`: подключение к `TEST_DATABASE_URL`, вставка и чтение `Counter`. Подними `test/helpers/db.ts`: `resetDb()` (TRUNCATE всех таблиц `RESTART IDENTITY CASCADE`) и `globalSetup` на `prisma migrate deploy` для тестовой БД. В `vitest.config.e2e.ts` поставь `fileParallelism: false` (общая БД).
- [ ] **Step 4: Seed.** `prisma/seed.ts`: данные берёшь из `client/src/api/mock/seed/{people,catalog,reference,orders}.ts` (пользователи с паролем `demo1234`, категории, поставщики, товары, справочники, статусы-маппинги, 16 заявок с клиентами и техникой, `Setting`, `Counter(purchase)=0`). Закупки и вложения сидом **не** лей: сделаешь после Task 8–9, вызвав сервисы (так сид подчиняется правилам, как на клиенте в `seed/scenario.ts`).
- [ ] **Step 5:** `npm run db:seed` в `package.json`. Проверка: в Studio 4 пользователя, 16 заявок, заявка `o15` со статусом `on-hold` без маппинга.
- [ ] **Commit:** `server: prisma schema, migration, seed`

**Готово когда:** миграция применяется на пустой БД, seed идемпотентен (повторный запуск без дублей), `resetDb()` работает в тестах.

---

## Task 3: Чистое доменное ядро (порт с тестами)

**Чему учишься:** отделять логику от фреймворка, это то, что легче всего тестируется.

**Files:**
- Create: `src/domain/money.ts`, `fifo.ts`, `permissions.ts`, `status.ts`, `format.ts`; тесты рядом `*.spec.ts`
- Create: `src/contract/` ← **копия** `client/src/api/contract` целиком (types, dto, constants, result). Копируй вручную при изменении контракта.
- Источники: `client/src/api/mock/engine/{money,fifo,permissions,status,format}.ts` и их `*.test.ts`

**Interfaces (должны совпасть с клиентом):**
- `roundQty(qty: number): number`
- `type BatchLike = { id: string; qtyRemaining: number; unitPriceKop: number }`
- `planFifo(batches: BatchLike[], qty: number): { lines: AllocationLine[]; totalKop: number; shortfall: number }` (батчи уже отсортированы FIFO вызывающим)
- `permissionsOf(user: Pick<User,'role'|'extraPermissions'>): Permission[]`; `can(user: User | null, p: Permission): boolean` (blocked → false)
- `orderStatusCode(mappings: StatusMapping[], raw: string): OrderStatusCode | null`; `isOrderLocked(mappings, raw): boolean`

- [ ] **Step 1:** Скопируй тесты `fifo.test.ts`, `money.test.ts`, `permissions.test.ts`, `status.test.ts`; переименуй в `*.spec.ts` (серверный `include`). Тесты использующие `Db`/`fixtures` перепиши на небольшие литералы.
- [ ] **Step 2:** Run: FAIL (файлов нет).
- [ ] **Step 3:** Перенеси функции. Главное изменение: вместо `db: Db` принимай массив/объект напрямую (`planFifo` уже чистая; `isOrderLocked(db, raw)` → `isOrderLocked(mappings, raw)`). `fifoBatches(db, productId)` не переносится: сортировку делает SQL (`ORDER BY receivedAt, id`).
- [ ] **Step 4:** Добавь тест на Review Focus №1: `planFifo([{0.1},{0.2}], 0.3)` → две линии, `shortfall 0`, `roundQty(0.2 - 0.2) === 0`.
- [ ] **Step 5:** Run `npm test` — PASS. **Commit:** `server: port pure domain logic with tests`

**Готово когда:** все ветки FIFO (нехватка, партии одной цены, нулевые) покрыты, `src/domain` не импортирует ни Nest, ни Prisma.

---

## Task 4: Общая инфраструктура: аудит и счётчик

**Чему учишься:** провайдеры, DI, глобальные модули, передача транзакции в сервисы.

**Files:**
- Create: `src/common/audit/audit.service.ts`, `audit.module.ts` (`@Global`), `src/common/counter/counter.service.ts`
- Test: `test/audit-counter.e2e-spec.ts`
- Источники: `engine/audit.ts` (форма записи)

**Interfaces:**
- `AuditService.record(tx: Tx, entry: { userId: string; action: AuditAction; objectType: string; objectId: string; objectLabel: string; before?: string; after?: string; reason?: string }, at?: Date): Promise<void>`
- `CounterService.next(tx: Tx, key: 'purchase'): Promise<number>`

- [ ] **Step 1: Failing-тесты.** `record` внутри транзакции, которая потом бросает, не оставляет записи (откат). Два параллельных `next` дают разные числа (1 и 2, без дублей).
- [ ] **Step 2–3:** Реализуй. `next`: **атомарный** апдейт в одном запросе (`UPDATE "Counter" SET value = value + 1 WHERE key = $1 RETURNING value` через `tx.$queryRaw`), а не «прочитал, прибавил». Строку счётчика создаёт seed/миграция.
- [ ] **Step 4:** Run — PASS. **Commit:** `server: audit and counter services`

**Готово когда:** оба теста зелёные, правило «аудит в той же транзакции» зафиксировано тестом отката.

---

## Task 5: Auth, пользователи, права

**Чему учишься:** Passport/JWT или свой guard, custom decorators, `Reflector`, порядок guard'ов.

**Files:**
- Create: `src/auth/{auth.module,auth.controller,auth.service,jwt.guard,current-user.decorator}.ts`, `src/auth/dto/login.dto.ts`; `src/permissions/{permissions.guard,require-permissions.decorator}.ts`; `src/users/{users.module,users.controller,users.service,users.mapper}.ts`, `dto/*`
- Test: `test/auth.e2e-spec.ts`, `test/users.e2e-spec.ts`
- Источники: `engine/users.ts`, `handlers/auth.ts`, `handlers/users.ts`, `contract/constants.ts`

**Interfaces:**
- `POST /auth/login {email,password}` → `Session` (`{ user, permissions }`) + `{ accessToken }`. Контракт возвращает `Session`; токен добавь рядом (клиент `api/http` его сохранит).
- `GET /auth/me` → `Session | 401`
- `@RequirePermissions(...p: Permission[])`; `@CurrentUser(): User` (достаёт пользователя, положенного guard'ом в `req.user`)
- `UsersService.create(actorId, input: UserInput & { password: string }): Promise<User>`, `update(actorId, id, patch: UserPatch): Promise<void>`, `list(): Promise<User[]>`
- Маршруты: `GET /users`, `POST /users`, `PATCH /users/:id` — все `users.manage`.

- [ ] **Step 1: Failing e2e (auth):** верный логин → 200 и токен; неверный пароль → 401; заблокированный → 401; `GET /auth/me` без токена → 401.
- [ ] **Step 2: Failing e2e (права):** executor на `GET /users` → 403; admin → 200; **Review Focus №3:** токен выдан, затем админ ставит `blocked: true`, тот же токен на `/auth/me` → 401.
- [ ] **Step 3:** `JwtGuard` (глобальный, `APP_GUARD`) проверяет подпись и **читает пользователя из БД на каждый запрос**; в токене только `sub`. Публичные маршруты (`login`, `health`, `webhook`) помечай декоратором `@Public()`. `PermissionsGuard` вычисляет `permissionsOf(user)` из БД, не из токена.
- [ ] **Step 4:** `UsersService`: пароль хешируй `bcryptjs` (cost 10). Уникальность e-mail без учёта регистра → `DomainError('Користувач з такою поштою вже існує.')`. Все ответы без `passwordHash` (маппер). `create/update` пишут аудит `user.create`/`user.update` в транзакции (порт текстов из `engine/users.ts`).
- [ ] **Step 5:** Тест: `PATCH` на ролях/блокировке ставит запись в `AuditLog`.
- [ ] **Step 6:** Run — PASS. Правка клиента для `password` в `UserInput`: попроси Claude. **Commit:** `server: auth, users, permissions guard`

**Готово когда:** без права 403, блокированный не проходит даже с живым токеном, пароль нигде не светится в ответах и логах.

---

## Task 6: Каталог (категории, поставщики, товары)

**Чему учишься:** CRUD-модуль целиком, DTO с `class-validator`, мапперы, `Prisma` include.

**Files:**
- Create: `src/catalog/{catalog.module}.ts`, `categories.controller/service`, `suppliers.controller/service`, `products.service` (контроллер товаров будет в warehouse), `catalog.mapper.ts`, `dto/*.dto.ts`
- Test: `test/catalog.e2e-spec.ts`
- Источники: `engine/catalog.ts`, `handlers/catalog.ts`, `contract/dto/accounts.ts`

**Interfaces:**
- `GET /categories` → `CategoryRow[]` (сортировка по `kind`, `name`; `productCount`, `parentName`); `POST /categories`, `PATCH /categories/:id` → `Category`
- `GET /suppliers` → `SupplierRow[]` (`purchasesCount`, `purchasesTotalKop`, `lastPurchaseDate`: **без отменённых**, по убыванию суммы); `POST`, `PATCH`
- `ProductsService.create(tx: Tx, actorId: string, input: ProductInput): Promise<Product>` и `update(...)` (используются из warehouse и purchases), аудит `product.create/update`
- Все записи пишут аудит (`category.*`, `supplier.*`).

- [ ] **Step 1: Failing e2e:** создание категории → 201 и появляется в списке; дубль имени в рамках `kind` → 422 (проверь, что делает `engine/catalog.ts`, и повтори его правила дословно); деактивация поставщика не удаляет его закупки; список поставщиков считает суммы без отменённых (проверишь после Task 8, пока `0`).
- [ ] **Step 2–3:** DTO классы с `@IsString()`, `@IsIn(...)`, `@IsOptional()` и т.д. `ValidationPipe` с `whitelist` сам режет лишние поля. Реализуй сервисы. `Unit` в БД `pcs|l|kg|m`, в API `шт|л|кг|м`: функция в маппере в обе стороны, тест на неё.
- [ ] **Step 4:** Права: чтение любому вошедшему, `POST/PATCH` — `purchases.create`; деактивация (`active:false`) — `inventory.manage` (проверка в сервисе по входным данным).
- [ ] **Step 5:** Run — PASS. **Commit:** `server: catalog module`

**Готово когда:** формы ответов совпадают с `CategoryRow`/`SupplierRow`; сверь визуально с `client/src/api/mock/handlers/catalog.ts`.

---

## Task 7: Склад (остатки, FIFO-превью, корректировка)

**Чему учишься:** транзакции Prisma, `SELECT … FOR UPDATE` через `$queryRaw`, Decimal.

**Files:**
- Create: `src/warehouse/{warehouse.module,warehouse.controller,warehouse.service,batches.repo,warehouse.mapper}.ts`, `dto/*`
- Test: `test/warehouse.e2e-spec.ts`, `src/warehouse/batches.repo.spec.ts` (если логика чистая)
- Источники: `engine/stock.ts`, `engine/adjust.ts`, `handlers/warehouse.ts`, `contract/dto/warehouse.ts`

**Interfaces (внутренние, их будут звать purchases и allocations):**
- `BatchesRepo.lockFifo(tx: Tx, productId: string): Promise<BatchRecord[]>` — партии товара с `qtyRemaining > 0` в порядке FIFO **под блокировкой** (см. ниже). `BatchRecord = { id; productId; qtyRemaining: number; qtyReceived: number; unitPriceKop: number; receivedAt: Date }`
- `WarehouseService.receive(tx, input: { productId; purchaseId; purchaseItemId; qty; unitPriceKop; receivedAt: Date; qtyRemaining?: number }): Promise<{ batchId: string }>`
- `WarehouseService.consume(tx, productId: string, qty: number): Promise<{ lines: AllocationLine[]; totalKop: number }>` — планирует FIFO под блокировкой, уменьшает остатки, бросает `DomainError` при нехватке; **не** пишет вложение и аудит (это дело вызывающего)
- `WarehouseService.restore(tx, lines: AllocationLine[]): Promise<void>` — возвращает количество в те же партии
- `WarehouseService.stockOf(tx | prisma, productId): Promise<{ qty; valueKop; avgPriceKop; inStock; batches }>` (логика `productStock`)
- HTTP: `GET /warehouse/stock` → `StockRow[]`; `GET /warehouse/products/:id` → `ProductDetail` (404 если нет); `GET /warehouse/products/:id/fifo-preview?qty=` → `FifoPreview`; `GET /warehouse/totals` → `StockTotals`; `POST /warehouse/products` (`purchases.create`), `PATCH /warehouse/products/:id` → через `ProductsService`; `POST /warehouse/adjustments {productId,deltaQty,reason}` (`inventory.manage`).

> **Алгоритм, который нельзя угадать (блокировка).** В `lockFifo`:
> `SELECT id, "qtyRemaining", "qtyReceived", "unitPriceKop", "receivedAt" FROM "Batch" WHERE "productId" = $1 AND "qtyRemaining" > 0 ORDER BY "receivedAt", id FOR UPDATE`.
> Планируй списание **по строкам, которые вернул этот запрос**, а не по данным, прочитанным раньше: под `READ COMMITTED` после ожидания блокировки `FOR UPDATE` возвращает актуальную версию строки. Блокируй всегда в одном порядке (`ORDER BY`), иначе два запроса по разным товарам в одной транзакции дадут deadlock. Значения `Decimal` переводи в `number` и применяй `roundQty` до передачи в `planFifo`.

- [ ] **Step 1: Failing e2e (чтение):** после ручной вставки двух партий (разные цены) `GET /warehouse/stock` отдаёт `qty`, `valueKop`, `avgPriceKop = round(valueKop/qty)`; товар с нулевым остатком остаётся в списке `inStock:false` со средней ценой по истории; `fifo-preview?qty=` через две партии даёт две линии с `receivedAt`.
- [ ] **Step 2: Failing e2e (корректировка):** `+5` создаёт партию `adjustment:true` без закупки по средней цене остатка (0, если истории нет); `-3` списывает FIFO; `-1000` → 422 «Відʼємні залишки заборонені…»; `0` → 422; пустая причина → 422; запись в аудит `inventory.adjust` с `before/after` как в `engine/adjust.ts`; executor → 403.
- [ ] **Step 3:** Реализуй `BatchesRepo`, `receive/consume/restore/stockOf`. Мапперы `StockRow`, `ProductDetail` (батчи новейшие первыми, с `supplierName` и `purchaseNumber` (пусто для корректировки), `usage` по вложениям товара — usage заполнишь, когда появится таблица вложений в Task 9, пока можно читать `prisma.allocation` напрямую только для чтения).
- [ ] **Step 4:** Run — PASS. **Commit:** `server: warehouse reads, FIFO consume/restore, stock adjustment`

**Готово когда:** формы `StockRow`/`ProductDetail` совпадают с контрактом, минус невозможен, корректировка идёт отдельной операцией.

---

## Task 8: Закупки

**Чему учишься:** оркестрация нескольких сервисов в одной транзакции.

**Files:**
- Create: `src/purchases/{purchases.module,purchases.controller,purchases.service,purchases.mapper,purchase-calc}.ts`, `dto/create-purchase.dto.ts`
- Test: `src/purchases/purchase-calc.spec.ts`, `test/purchases.e2e-spec.ts`
- Источники: `engine/purchases.ts`, `engine/purchases.test.ts`, `handlers/purchases.ts`, `contract/dto/purchases.ts`

**Interfaces:**
- Чистые (в `purchase-calc.ts`, порт без `Db`): `purchaseTotalKop(items)`, `purchaseStatus({cancelled, batches})`, `canCancel({cancelled, batches})`, `purchaseAllocatedKop(batches)`, `purchaseRemainingKop(batches)`
- `PurchasesService.create(actorUser: User, input: CreatePurchaseInput): Promise<CreatePurchaseResult>`
- `PurchasesService.cancel(actorId: string, id: string, reason: string): Promise<void>`
- HTTP: `GET /purchases` (`purchases.view`) → `PurchaseRow[]` (новые первыми); `GET /purchases/:id` → `PurchaseDetail` (с `history` из аудита по `objectType='Закупівля'`); `POST /purchases` (`purchases.create`) → `CreatePurchaseResult`; `POST /purchases/:id/cancel {reason}`.

- [ ] **Step 1: Unit-тесты** чистых функций (порт `purchases.test.ts` расчётных частей): статусы `new/partial/full/cancelled`, `canCancel` false если что-то списано.
- [ ] **Step 2: Failing e2e (создание):** закупка на склад из 2 позиций → партии созданы, номер `З-0001` затем `З-0002`, остаток вырос, аудит `purchase.create`; закупка `destination:'order'` → партия обнулена **и** создано вложение с одной линией (цена партии), `allocationIds` непусты; в закрытую заявку (`Видано`) → 422; без позиций, с `qty<=0`, с `unitPriceKop<=0`, без поставщика → 422/400.
- [ ] **Step 3: Failing e2e (новый товар):** позиция `{ newProduct, qty, unitPriceKop }` создаёт товар и закупку **одной транзакцией**. **Review Focus №6:** закупка с новым товаром и невалидным поставщиком → 422 и в `Product` нет нового товара.
- [ ] **Step 4: Failing e2e (отмена):** отмена с причиной ставит `cancelled`, обнуляет `qtyRemaining` партий, аудит; после частичного списания → 422 «З цієї закупівлі вже є вкладення…» и ничего не изменилось; без причины → 422; повторная → 422.
- [ ] **Step 5: Реализуй.** Всё в `prisma.inTx`: `CounterService.next` → создать `Purchase`+`PurchaseItem` → для каждой позиции `warehouse.receive(...)` → если `order`: создать `Allocation`+`AllocationLine` (через `AllocationsService.createFromBatch`, внутренний метод, добавишь заглушку здесь и реализуешь в Task 9) → `audit.record`. Порядок проверок как в `createPurchase`. `destination:'order'` требует у пользователя ещё и `allocations.create` (проверка в сервисе).
- [ ] **Step 6:** Мапперы `PurchaseRow` (`allocatedKop`, `remainingKop`, `status`, `createdByName`, `orderNumber`) и `PurchaseDetail` (`items` с `allocatedQty/availableQty`, `canCancel`).
- [ ] **Step 7:** Run — PASS. **Commit:** `server: purchases`

**Готово когда:** закупка не равна расходу (суммы закупок не меняются от вложений), отмена откатывает остаток.

---

## Task 9: Заявки (чтение) и вложения

**Чему учишься:** самая «денежная» часть: блокировки, возвраты, права в зависимости от данных.

**Files:**
- Create: `src/orders/{orders.module,orders.controller,orders.service,orders.mapper}.ts`; `src/allocations/{allocations.module,allocations.controller,allocations.service}.ts`, `dto/*`
- Test: `test/orders.e2e-spec.ts`, `test/allocations.e2e-spec.ts`
- Источники: `engine/allocations.ts`, `engine/allocations.test.ts`, `handlers/orders.ts`, `handlers/allocations.ts`, `contract/dto/orders.ts`

**Interfaces:**
- `GET /orders?search=` → `OrderRow[]` (поиск по номеру, клиенту, технике; `statusCode`, `statusLabel`, `locked`, `costKop` = сумма активных вложений, `lastOperationAt`, `allocationsCount`); `GET /orders/:id` → `OrderDetail` (404 нет). Права: любой вошедший.
- `AllocationsService.add(actor: User, input: AddAllocationInput): Promise<Allocation>`
- `AllocationsService.release(actor: User, id: string, mode: 'returned' | 'cancelled', reason?: string): Promise<void>`
- `AllocationsService.transfer(actor: User, id: string, toOrderId: string, reason?: string): Promise<void>`
- `AllocationsService.createFromBatch(tx, input: { orderId; productId; line: AllocationLine; createdById; at: Date }): Promise<{ id: string }>` (для закупок)
- HTTP: `POST /allocations` (`allocations.create`), `POST /allocations/:id/release {mode, reason?}`, `POST /allocations/:id/transfer {toOrderId, reason?}`.

**Новое против клиента (серверное правило прав):** если заявка закрыта (`isOrderLocked`), нужен `can(actor,'allocations.edit_closed')`, иначе **403** (не 422); причина обязательна (иначе 422). При переносе: если закрыта любая из двух заявок, правило то же.

- [ ] **Step 1: Failing e2e (заявки):** список и поиск; заявка `o15` (`on-hold`) возвращается с `statusCode: null`, `locked:false` (**Review Focus №4**); `costKop` равен сумме активных вложений, возвращённые и отменённые не считаются.
- [ ] **Step 2: Failing e2e (add):** вложение 7 при партиях 5 и 5 → две линии по ценам партий, остатки 0 и 3; сумма = сумма линий; qty > остатка → 422 «На складі доступно лише…»; `qty<=0` → 422; закрытая заявка без причины → 422; закрытая заявка, причина есть, но у executor нет `edit_closed` → 403, у admin → 201; аудит `allocation.create`. Дробь (Review Focus №1): партии 0.1 и 0.2, вложение 0.3 → оба остатка ровно `0`.
- [ ] **Step 3: Failing e2e (release):** `returned` и `cancelled` возвращают кол-во в **те же партии** по их ценам; повтор → 422 «Це вкладення вже не активне»; закрытая заявка требует причину и право. Блокируй строку вложения `FOR UPDATE`, затем партии, иначе два параллельных возврата вернут дважды.
- [ ] **Step 4: Failing e2e (transfer):** остатки склада не меняются, `transferredFromOrderId` заполнен, сумма закупок не растёт; на ту же заявку → 422; в/из закрытой заявки — правило прав как выше; аудит `allocation.transfer`.
- [ ] **Step 5: Реализуй** `add`: `inTx` → найти заявку и товар → проверки → `warehouse.consume` → создать `Allocation`+`AllocationLine[]` → `audit`. Текст ошибок бери из `engine/allocations.ts` дословно.
- [ ] **Step 6:** `OrderDetail`: `allocations` (активные), `history` (все), `costByCategory`, `sourcePurchases` (закупки партий линий, пусто для корректировок), `transferredFromOrderNumber`. Читай как в `handlers/orders.ts`.
- [ ] **Step 7:** Закупки «в заявку»: подключи настоящий `createFromBatch` и допиши e2e Task 8 Step 2, если он был заглушкой.
- [ ] **Step 8:** После этого задачи сид закупок и вложений: допиши в `prisma/seed.ts` вызов сервисов (по образцу `client/src/api/mock/seed/scenario.ts`: 11 закупок, 29 вложений), запусти.
- [ ] **Step 9:** Run — PASS. **Commit:** `server: orders and allocations`

**Готово когда:** все ветки `allocations.test.ts` клиента воспроизведены e2e, 403 для закрытой заявки без права работает.

---

## Task 10: Отчёты и журнал

**Чему учишься:** переиспользование готового кода; read-only сервисы; агрегаты.

**Стратегия R (быстрый порт).** Функции `reports.ts`, `analytics.ts`, `dates.ts`, `util.ts`, `format.ts`, `types.ts` (структура `Db`) работают на «плоском» объекте. Для **чтения** загрузи нужные таблицы в такой объект и вызови функции как есть: порт без переписывания и с готовыми тестами. Для записи так делать **нельзя**. Данных мало (сервисный центр), поэтому принято; при росте заменишь на SQL по месту.

**Files:**
- Create: `src/reports/engine/*` (копии `reports.ts`, `analytics.ts`, `dates.ts`, `util.ts`, `types.ts`, `allocations.ts` только функции `orderAllocations/orderCostKop`, `purchases.ts` только расчётные, `stock.ts`, `status.ts` на твоих чистых версиях) вместе с `reports.test.ts`, `analytics.test.ts` и `fixtures.ts` как `*.spec.ts`
- Create: `src/reports/{reports.module,reports.controller,reports.service,db-snapshot.ts}`, `src/reports/audit.controller.ts`
- Test: `src/reports/engine/*.spec.ts`, `test/reports.e2e-spec.ts`
- Источники: `handlers/reports.ts`, `handlers/audit.ts`, `contract/dto/reports.ts`

**Interfaces:**
- `loadDbSnapshot(prisma: PrismaService, opts?: { from?: Date; to?: Date }): Promise<Db>` — читает таблицы (qty и даты уже в `number` и ISO-строках), собирает форму `Db`
- `GET /reports/dashboard?from=&to=` → `DashboardData`; `GET /reports/analytics?from&to&userId&categoryId&supplierId&assetType&status` → `AnalyticsData` (оба `reports.view`; значение «нет фильтра» = `all`)
- `GET /audit?from&to` → `AuditRow[]` (новые первыми, `reports.view`)

- [ ] **Step 1:** Скопируй тесты движка отчётов, добейся зелёного на скопированных функциях с `fixtures`.
- [ ] **Step 2: Failing e2e:** на данных seed `dashboard` даёт `purchasesKop` = сумма неотменённых закупок периода, `allocatedKop` = сумма активных вложений, `stockValueKop` = `GET /warehouse/totals`, `allocatedVsStock` вместе = сумма закупок периода (формула из `reports.ts`). **Review Focus №5:** пустой период и пустая БД → нули, `avgKop` не `NaN`.
- [ ] **Step 3:** Сервисы + контроллеры. `dashboard.recentOperations` = последние записи журнала (новые первыми) с `userName`.
- [ ] **Step 4:** Инвариант в тесте: `dashboard.metrics.stockValueKop` равен сумме `valueKop` по `/warehouse/stock`.
- [ ] **Step 5:** Run — PASS. **Commit:** `server: reports and audit read`

**Готово когда:** цифры dashboard сходятся с отдельными списками (закупки, вложения, склад).

---

## Task 11: Интеграция RO App, настройки, справочники

**Чему учишься:** абстракция через интерфейс и токен DI (`useClass`/`useFactory`), `@nestjs/schedule`, публичный вебхук с секретом, идемпотентный upsert.

> **Формат API RO App неизвестен** (в ТЗ он в списке «уточнить»). Поэтому сначала делаем интерфейс и **фейковый** клиент на данных seed: вся логика синхронизации работает и тестируется без сети. Настоящий клиент напишешь, когда сверишь документацию RO App вручную.

**Files:**
- Create: `src/integration/{integration.module,integration.controller,roapp.client.ts (interface+token),fake-roapp.client.ts,http-roapp.client.ts,sync.service,webhook.controller,sync.cron}.ts`; `src/settings/{settings.module,settings.controller,settings.service}.ts`; `src/reference/reference.controller.ts`
- Test: `test/integration.e2e-spec.ts`, `test/settings-reference.e2e-spec.ts`
- Источники: `handlers/integration.ts`, `handlers/settings.ts`, `handlers/reference.ts`, `engine/integration.ts` (**только** для правил журнала; не порти симуляцию), `contract/dto/integration.ts`

**Interfaces:**
- `interface RoAppClient { listOrders(since?: Date): Promise<ExternalOrder[]>; listClients(...): Promise<ExternalClient[]>; listAssets(...); listOrderStatuses(): Promise<string[]>; listOrderTypes(): Promise<ExternalOrderType[]> }` + `export const ROAPP_CLIENT = Symbol('ROAPP_CLIENT')`
- `SyncService.run(source: SyncSource, actorId?: string): Promise<SyncResult>` — **единственная** функция синхронизации (кнопка, вебхук, cron зовут её)
- HTTP: `GET /integration/status` → `IntegrationStatus` и `POST /integration/sync` (`settings.manage`), `POST /integration/webhook` (`@Public`, проверка секрета, шаг 7); `GET /settings`, `PATCH /settings` (`settings.manage`) → `Settings`; `GET /reference` → `Reference` (любой вошедший)

- [ ] **Step 1: Failing e2e (sync):** `FakeRoAppClient` отдаёт 3 заявки; `run('manual')` → `added: 3`; повторный `run` → `added: 0, updated: N`, **дублей нет** (upsert по `externalId`); в `SyncLog` запись с `source` и `ok`; аудит `integration.sync`.
- [ ] **Step 2:** Реализуй upsert по `externalId` для `Client`, `Asset`, `OrderType`, `Order` в транзакции. Статус пишется сырым в `Order.rawStatus`; если `StatusMapping` для него нет, ничего не падает (**Review Focus №4**): `reference.unmappedStatuses` содержит его (distinct сырые статусы заявок без маппинга).
- [ ] **Step 3: Недоступность RO App:** клиент бросает → `SyncLog(ok:false, message)`, исключение не вылетает наружу из cron и не трогает закупки/вложения; тест: `POST /integration/sync` при падающем клиенте → ответ 422 с сообщением, данные не изменились.
- [ ] **Step 4:** `GET /integration/status`: `lastSyncAt` (последний `ok`), счётчики, `log` (новые первыми, ограничь 50), `settings` (подмножество). Тест на форму.
- [ ] **Step 5:** `Settings`: одна строка id=1; `PATCH` частично; `webhookUrl` формируй из конфигурации. `Reference`: `orderTypes`, `statusMappings`, `assetTypes` (distinct из `Asset.type`), `unmappedStatuses`, `employees` (distinct `managerName`/`engineerName` как `{id: name, name}` или по пользователям с `roAppName`: возьми как в `handlers/reference.ts`), `categories`, `suppliers`.
- [ ] **Step 6: Провайдер клиента:** `{ provide: ROAPP_CLIENT, useFactory: (cfg) => cfg.get('ROAPP_TOKEN') ? new HttpRoAppClient(...) : new FakeRoAppClient(), inject: [ConfigService] }`.
- [ ] **Step 7 (откладываемое): вебхук.** `POST /integration/webhook` публичный. Сравни секрет из заголовка/подписи с `ROAPP_WEBHOOK_SECRET` через `crypto.timingSafeEqual`. Неверный секрет → 401. Тело → `SyncService.run('webhook')` по изменённой заявке. Формат подписи и событий сверь вручную по `roapp.readme.io`.
- [ ] **Step 8 (откладываемое): ночной cron.** `@nestjs/schedule`, `@Cron` читает время из `Setting.nightlySyncTime` (динамически: `SchedulerRegistry`), вызывает `run('nightly')`.
- [ ] **Step 9:** Run — PASS. **Commit:** `server: roapp integration, settings, reference`

**Готово когда:** повторный sync без дублей, неизвестный статус сохраняется сырым, при падении RO App работа идёт на кэше.

---

## Task 12: Инварианты и параллельность (тесты, которые защищают деньги)

**Чему учишься:** интеграционное тестирование БД, гонки в `Promise.all`.

**Files:**
- Create: `test/helpers/assert-invariants.ts`, `test/invariants.e2e-spec.ts`, `test/concurrency.e2e-spec.ts`
- Источники: `engine/assert-invariants.ts`, `engine/invariants.test.ts`

**Interfaces:**
- `assertInvariants(prisma: PrismaService): Promise<void>` — 4 проверки из клиентского `assert-invariants.ts`, только на SQL/Prisma: (1) `0 ≤ qtyRemaining ≤ qtyReceived`; (2) сверка «сумма `remaining × price` партий активных закупок + партий-корректировок = сумма `remaining × price` по всем партиям»; (3) отменённая закупка не держит остаток; (4) у каждого вложения `totalKop` = сумма линий и `qty` = сумма `qty` линий, все партии линий существуют.

- [ ] **Step 1: Параллельность (Review Focus №2).** Остаток 1 шт, два `POST /allocations` одновременно в разные заявки через `Promise.all`: ровно один 201, второй 422, остаток 0; затем `assertInvariants`.
- [ ] **Step 2:** Параллельные возвраты одного вложения: один 200, второй 422, остаток не удвоился. Параллельные закупки: номера уникальны.
- [ ] **Step 3: Случайная последовательность.** По образцу `invariants.test.ts`: 150 операций (закупка, вложение, возврат, отмена, перенос, корректировка, отмена закупки) с воспроизводимым ГСЧ (seed), ошибки 422 допустимы, после **каждого** шага `assertInvariants`. Если инвариант нарушился, печатай seed и шаг.
- [ ] **Step 4:** Run `npm run test:e2e` — PASS. **Commit:** `server: invariant and concurrency tests`

**Готово когда:** тест на гонку проходит стабильно (запусти 10 раз подряд), случайная последовательность зелёная.

---

## Task 13: Подключение клиента (`api/http`)

**Чему учишься:** как контракт превращается в HTTP.

**Files (в `client/`):** Create: `src/api/http/{index,fetcher,auth,users,catalog,warehouse,purchases,orders,allocations,reports,audit,integration,settings,reference}.ts`; Modify: `src/api/active-client.ts`, `.env.example` (`VITE_API_URL`)

> Это правка клиента: попроси Claude сделать (или делай сам). Серверные тесты это не затрагивает.

**Interfaces:**
- `createHttpClient(baseUrl: string): ApiClient`
- `fetcher`: добавляет `Authorization: Bearer`, токен в `localStorage`; 401 → разлогин; **422 → `{ ok:false, error: body.message }`**; 404 на `GET :id` → `null`; сетевые ошибки → исключение для TanStack Query.

- [ ] **Step 1:** Реализуй `ApiClient` целиком. `auth.login` кладёт токен; `loginAsDemo`/`resetDemoData`/`listDemoUsers` бросают «only in mock» (UI демо-переключателя должен быть скрыт при `VITE_API_URL`).
- [ ] **Step 2:** `active-client.ts`: если задан `VITE_API_URL`, экспортируй http-клиент, иначе мок.
- [ ] **Step 3: Ручной сценарий** (чек-лист): логин admin → dashboard цифры; закупка на склад; склад и «Розподілити»; вложение в закрытую заявку без причины (ошибка) и с причиной; возврат; перенос; корректировка (минус больше остатка → ошибка); executor не видит и не может зайти на `/users` (403 на API); интеграция «Синхронізувати».
- [ ] **Step 4:** `npm run build` и `npm test` клиента зелёные. **Commit (client):** `client: add http ApiClient`

**Готово когда:** весь ручной сценарий проходит на реальном сервере и в UI нет обращений к `api/mock` при заданном `VITE_API_URL`.

---

## Task 14: Hardening (отложенное, по мере времени)

Делай по пунктам, каждый пункт отдельным коммитом.

- [ ] **Idempotency-Key** на `POST /purchases` и `POST /allocations`: таблица `IdempotencyKey(key, userId, route, status, responseBody, createdAt)`, `@@unique([key, userId, route])`; interceptor: при повторе с тем же ключом отдаёт сохранённый ответ, при гонке второй ждёт/получает 409. Тест: два одинаковых запроса дают одну закупку. Клиент шлёт ключ из `useSingleFlight` (правка клиента).
- [ ] **Rate limit** `@nestjs/throttler` на `POST /auth/login` (например 5 за минуту на IP). Тест: 6-й запрос 429.
- [ ] **Refresh-токен:** таблица `RefreshToken(hash, userId, expiresAt, revokedAt)`, `POST /auth/refresh`, `POST /auth/logout` отзывает. Access сократи до 15 мин.
- [ ] **Swagger** `@nestjs/swagger` на `/api/docs` только вне production.
- [ ] **Логи без персональных данных:** `Logger`, маскирование `email`/`phone`, не логировать тела запросов `login`.
- [ ] **Helmet** и `trust proxy` по месту деплоя.
- [ ] **Экспорт** (`reports.export`): CSV первым (`GET /reports/analytics/export?format=csv`), потом XLSX (`exceljs`), PDF последним.
- [ ] **Фото чека:** `POST /purchases/:id/receipt` (multipart, `Attachment`), доступ только с `purchases.view`.
- [ ] **Backup:** скрипт `pg_dump` по расписанию и проверка восстановления на `mlt_test`.
- [ ] **NestJS Observe:** `npx @nestjs/observe link` (см. `server/AGENTS.md`).

---

## Task 15: Документация

- [ ] Обнови `docs/03-backend-plan.md` (структура модулей по факту, список закрытых решений), `docs/01-idea.md` (пункт про `client/src/domain` устарел), добавь строку в журнал изменений `docs/02-spec.md` (серверное правило 403 для закрытой заявки, `password` в `UserInput`, права справочников).
- [ ] `server/README.md`: как поднять БД, `.env`, миграции, seed, тесты.

---

## Порядок работы на день (рекомендация)

1. Task 0–2 (день 1): каркас и схема.
2. Task 3–5 (день 2): ядро, аудит, auth. Дальше уже можно ходить в API с токеном.
3. Task 6–8 (день 3–4): каталог, склад, закупки.
4. Task 9–10 (день 5–6): вложения, отчёты.
5. Task 11–12 (день 7): интеграция и тесты инвариантов.
6. Task 13 (день 8): подключить клиент и пройти сценарий.

## Как работать с Claude по этому плану

- Перед каждой задачей: «разбери Task N, объясни концепции Nest, которые там нужны» (без кода).
- После задачи: покажи `git diff` и попроси ревью на инварианты (особенно блокировки и транзакции).
- Правки клиента (пароль в `UserInput`, `api/http`) делает Claude по запросу.
