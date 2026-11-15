# Фронтенд: текущее состояние

Каталог `client/`. Это кликабельный прототип на моках (этап 1 из ТЗ). Бэкенда нет, все данные лежат в `localStorage`. Подробный README с правилами на украинском: `client/README.md`.

## Стек

React 19, Vite 8, TypeScript 6, Tailwind v4 (`@tailwindcss/postcss`), React Router 7, Recharts 3, lucide-react. Примитивы UI (`components/ui`) написаны вручную в стиле shadcn, без Radix и без CLI shadcn. Алиас `@/*` указывает на `src/*` (в `tsconfig.app.json` только `paths`, без `baseUrl`, он устарел в TS 6).

## Маршруты

`/login`, `/` (dashboard), `/orders`, `/orders/:id`, `/purchases`, `/purchases/new`, `/purchases/:id`, `/inventory` (Склад), `/suppliers`, `/categories`, `/analytics`, `/audit`, `/users`, `/integration`, `/settings`. Старый `/unallocated` перенаправляет на `/inventory`. Доступ закрывают `RequireAuth` и `Guard(permission)`; на сервере то же должно проверяться заново.

## Права

`purchases.view`, `purchases.create`, `allocations.create`, `allocations.edit_closed`, `inventory.manage`, `reports.view`, `reports.export`, `users.manage`, `settings.manage`. Роль admin имеет все, executor: `purchases.view`, `purchases.create`, `allocations.create`. Менеджерские права добавляются через `extraPermissions` пользователя.

## Данные и логика

- Вся логика в `src/domain` (чистый TypeScript без React): `types.ts`, `calc.ts` (FIFO, остатки, себестоимость, аналитика), `ops.ts` (все операции с записью в аудит), `permissions.ts`, `labels.ts`.
- `store/db-store.tsx` держит всю БД в одном состоянии и пишет в `localStorage` (`mlt-oblik:db:v1`, пользователь `mlt-oblik:user:v1`, тема `mlt-oblik:theme:v1`). Операции идут через `apply(fn)` (на `structuredClone`, фиксируется только при `ok`) или `mutate(fn)` (без проверок, для настроек).
- `mocks/seed.ts` строит демо-БД теми же операциями, что использует UI: 18 товаров, 5 поставщиков (один неактивный), 16 заявок, события закупок и вложений. Заявка `o15` имеет намеренно не замапленный статус `on-hold`. Демо-пользователи: `u_admin`, `u_master`, `u_manager`, `u_master2`.
- Деньги: целые копейки в полях `*Kop`; количества округляются `roundQty`.

## Склад и закупки (актуальная логика)

- На странице «Склад» одна таблица товаров: остаток, средняя цена, стоимость, статус. В строке кнопки «Розподілити» (диалог `components/allocation/allocate-product-dialog.tsx`, цена по FIFO), «Поповнити», корректировка остатка (право `inventory.manage`).
- Страница «Нова закупівля» всегда создаёт закупку на склад. Закупка «в заявку» создаётся только из `components/allocation/add-allocation-dialog.tsx` внутри карточки заявки.
- В закупках колонка «Залишок на складі», на dashboard одна цифра стоимости склада. Функции в `calc.ts`: `purchaseRemainingKop`, `allocatedVsStock`.

## Тема

Токены CSS в `src/index.css` (`:root` и `.dark`), палитра: `#06141B #11212D #253745 #4A5C6A #9BA8AB #CCD0CF`. По умолчанию тёмная тема. Два вспомогательных токена `--success` и `--warning` нужны только для бейджей статусов. Цвета только через токены.

## Правки в очереди (по замечаниям разработчика)

- Переделать мобильный дизайн (не устраивает). Сейчас мобильный режим: `UiProvider.forceMobile` показывает рамку телефона 390px, `isNarrow` при ширине менее 768px, навигация мастера `MOBILE_NAV_ITEMS` из двух разделов.
- Прочие мелкие правки: разработчик назовёт отдельно.
- После готовности API: заменить `apply()` вызовами API (шаг 12 из `03-backend-plan.md`), localStorage оставить только для темы.

## Известные ограничения прототипа

- Нет серверной проверки прав, нет транзакций и блокировок, нет idempotency.
- Синхронизация RO App в `ops.ts` (`syncRoApp`) только симулируется.
- Нет автотестов во фронтенде (проверки делались одноразовыми скриптами вне репозитория). После переноса логики на сервер её надо покрыть юнит-тестами там.
