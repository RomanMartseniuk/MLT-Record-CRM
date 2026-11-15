/**
 * Внутрішні типи рушія імітації сервера.
 *
 * Типи сутностей (User, Purchase, Batch…) — це контракт, вони живуть у
 * `@/api/contract/types`. Тут лише те, що існує всередині «сервера» і
 * ніколи не потрапляє на сторінки: контейнер сховища `Db`.
 *
 * На реальному сервері `Db` не існує: його замінюють таблиці PostgreSQL
 * (Prisma), а кожна колекція нижче стає таблицею з тією самою назвою.
 */

import type {
  Allocation,
  Asset,
  AuditEntry,
  Batch,
  Category,
  Client,
  Order,
  OrderType,
  Product,
  Purchase,
  Settings,
  StatusMapping,
  Supplier,
  SyncLogEntry,
  User,
} from '@/api/contract/types'

export type { SyncSource } from '@/api/contract/types'

/** Уся імітована база даних одним об'єктом (зберігається в `localStorage`). */
export interface Db {
  users: User[]
  orderTypes: OrderType[]
  /** Довідник статусів RO App: сирий рядок → локальний enum. */
  statusMappings: StatusMapping[]
  clients: Client[]
  assets: Asset[]
  /** Заявки з RO App (лише читаються). */
  orders: Order[]
  categories: Category[]
  products: Product[]
  suppliers: Supplier[]
  purchases: Purchase[]
  /** Партії складу: єдине джерело правди про залишки й ціни. */
  batches: Batch[]
  allocations: Allocation[]
  /** Журнал операцій (записи не видаляються). */
  audit: AuditEntry[]
  syncLog: SyncLogEntry[]
  settings: Settings
  lastSyncAt: string | null
  /** Лічильники для людських номерів (З-0001…). */
  counters: {
    purchase: number
  }
}
