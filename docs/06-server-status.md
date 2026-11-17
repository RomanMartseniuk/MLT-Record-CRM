# Статус разработки сервера

Файл для продолжения работы с другой машины или в новой сессии Claude Code. Обновляй его в конце рабочей сессии. План задач: `superpowers/plans/2026-11-16-server-implementation.md`. Jira: проект MLT, эпик MLT-1, задача Sn = MLT-(n+2) (S0 = MLT-2 … S15 = MLT-17).

## Где остановились (2026-11-17)

| Задача | Статус |
|---|---|
| S0 Окружение (MLT-2) | Готово по факту. Статус в Jira не переведён. |
| S1 Каркас, конфиг, ошибки, `/health` (MLT-3) | Готово, закоммичено. Статус в Jira не переведён. |
| S2 Схема БД, Prisma, seed (MLT-4) | В процессе: Prisma 7 установлен и настроен, **моделей в `schema.prisma` ещё нет**. |

**Следующий шаг:** слой 1 схемы: `User`, `Category`, `Supplier`, `Product` (поля из плана, Task 2, Step 1). Затем слои по порядку:

1. Пользователи и справочники: `User`, `Category`, `Supplier`, `Product`
2. Склад и закупки: `Purchase`, `PurchaseItem`, `Batch`, `Counter`
3. Заявки из RO App: `Client`, `Asset`, `OrderType`, `Order`, `StatusMapping`
4. Вложения: `Allocation`, `AllocationLine`
5. Служебные: `AuditLog`, `SyncLog`, `Setting`, `Expense`, `RefreshToken`

Единую миграцию `init` делаем, когда схема целиком проходит `npx prisma validate`. Потом `PrismaService` + `inTx`, `resetDb()` для тестов, `schema.e2e-spec.ts`, seed.

## Решения разработчика (поверх плана)

- Деньги: целые копейки (`*Kop`, `Int`).
- Количество: **2 знака после запятой** (`Decimal(12,2)`, `roundQty` до 2 знаков), в плане было 3. Нужны правки клиента: `roundQty` в `client/src/api/mock/engine`, тесты и демо-данные. Ещё не сделано.
- ID: строки uuid.
- Токены: access JWT 8 ч **и refresh-токен 30 дней** (хеш в БД, ротация, отзыв при выходе и блокировке). Задача переезжает из S14 в S5. Нужна таблица `RefreshToken`. В `.env` есть `JWT_REFRESH_EXPIRES_IN=744h`, `validateEnv` её пока не читает.
- Пароль: `bcryptjs`. При создании пользователя **пароль генерирует сервер** и один раз отдаёт в ответе. Пользователь меняет его сам (`POST /auth/change-password`), у `User` есть `mustChangePassword`. Админ может сбросить пароль (новый сгенерированный). Нужны правки клиента (диалог создания и форма смены пароля).
- Права на справочники: читать любой вошедший; создавать и править категории, поставщиков, товары: `purchases.create`; блокировка и деактивация: `inventory.manage`.
- Ошибки бизнес-правил: HTTP 422 с украинским `message`. Время в UTC (`@db.Timestamptz(3)` на каждом `DateTime`).
- Docker не используется. На Render: управляемый Postgres и `prisma migrate deploy` при деплое.
- **Prisma 7 (классический `schema.prisma`)**, не Prisma 8 RC (в документации prisma.io по умолчанию описан 8, там `contract.prisma`, его не берём).

В описаниях задач Jira (MLT-4, MLT-7, MLT-9 и других) могут остаться старые решения. Их стоит обновить.

## Как поднять окружение на новой машине

1. Установить Node.js 24 (нужно 24.11+ или 22.18+) и PostgreSQL (локально или через DBngin).
2. В Postgres создать две базы в UTF8. Если кластер в WIN1252, создавать из `template0`:
   ```sql
   create database mlt with template template0 encoding 'UTF8';
   create database mlt_test with template template0 encoding 'UTF8';
   ```
3. `cd server && npm install`, затем скопировать `server/.env.example` в `server/.env` и заполнить:
   - `DATABASE_URL=postgresql://postgres@localhost:5432/mlt` (без пароля при `trust`-доступе)
   - `TEST_DATABASE_URL=postgresql://postgres@localhost:5432/mlt_test`
   - `JWT_SECRET`: любая строка от 16 символов
   - `JWT_EXPIRES_IN=8h`, `JWT_REFRESH_EXPIRES_IN=744h`, `PORT=3000`, `CORS_ORIGIN=http://localhost:5173`
4. `npx prisma generate` (клиент генерируется в `server/generated/prisma`, в git не лежит). Когда появятся миграции: `npx prisma migrate deploy`.
5. Проверка: `npm test`, `npm run test:e2e`, `npm run lint`, `npm run start:dev`, затем `GET http://localhost:3000/api/v1/health`.

Файлы `.env`, каталог данных Postgres `DB/` и `generated/` в git не попадают: на новой машине их нужно создать.

## Как работаем

- Разработчик пишет сервер сам (практика по NestJS и Prisma). Claude объясняет, ревьюит по критериям «Готово когда», пишет тесты (сначала красные, они задают контракт) и правки клиента.
- Идём маленькими шагами, с Prisma разработчик раньше не работал.
- Коммиты маленькие, формат `server: <что сделано>`. Claude коммитит только по просьбе.
- Общение на русском.
