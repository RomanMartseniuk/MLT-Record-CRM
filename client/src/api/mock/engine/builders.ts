/**
 * Builders for the entities of the engine tests.
 *
 * Tests describe only the data that matters for the case and leave the rest
 * to sensible defaults. Every builder returns a fresh object, so a test can
 * change it freely.
 */

import type {
  Allocation,
  Asset,
  Batch,
  Order,
  Product,
  Purchase,
  Supplier,
  User,
} from '@/api/contract/types'
import type { Db } from './types'

/** An empty but valid database with the standard RO App status mapping. */
export function makeDb(overrides: Partial<Db> = {}): Db {
  return {
    users: [],
    orderTypes: [],
    statusMappings: [
      { raw: 'in-queue', local: 'inQueue', label: 'В черзі' },
      { raw: 'in-progress', local: 'inWork', label: 'В роботі' },
      { raw: 'ready', local: 'done', label: 'Готово' },
      { raw: 'closed', local: 'closed', label: 'Видано' },
    ],
    clients: [],
    assets: [],
    orders: [],
    categories: [],
    products: [],
    suppliers: [],
    purchases: [],
    batches: [],
    allocations: [],
    audit: [],
    syncLog: [],
    settings: {
      orgName: 'Test',
      currency: 'UAH',
      timeZone: 'Europe/Kyiv',
      dateFormat: 'DD.MM.YYYY',
      nightlySyncTime: '03:00',
      webhookUrl: '',
      webhookEnabled: false,
    },
    lastSyncAt: null,
    counters: { purchase: 0 },
    ...overrides,
  }
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    fullName: 'Test User',
    email: 'test@example.com',
    role: 'executor',
    extraPermissions: [],
    blocked: false,
    ...overrides,
  }
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Product',
    categoryId: 'c1',
    unit: 'шт',
    photoTone: 0,
    links: [],
    active: true,
    ...overrides,
  }
}

export function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return { id: 's1', name: 'Supplier', active: true, ...overrides }
}

/** A batch for product `p1`, received long ago, with all of it still in stock. */
export function makeBatch(overrides: Partial<Batch> = {}): Batch {
  return {
    id: 'b1',
    productId: 'p1',
    purchaseId: 'pur1',
    purchaseItemId: 'pit1',
    qtyReceived: 10,
    qtyRemaining: 10,
    unitPriceKop: 1000,
    receivedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  }
}

/** An order whose RO App status is "in progress" (so it is not locked). */
export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    externalId: 'ext-o1',
    number: '4201',
    rawStatus: 'in-progress',
    typeId: 'ot1',
    createdAt: '2026-01-01T10:00:00.000Z',
    dueDate: '2026-01-10T10:00:00.000Z',
    clientId: 'cl1',
    assetId: 'a1',
    managerName: 'Manager',
    engineerName: 'Engineer',
    malfunction: 'Does not start',
    syncedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  }
}

export function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: 'pur1',
    number: 'З-0001',
    date: '2026-01-01T10:00:00.000Z',
    supplierId: 's1',
    hasReceipt: false,
    destination: 'warehouse',
    cancelled: false,
    createdById: 'u1',
    items: [],
    ...overrides,
  }
}

export function makeAllocation(overrides: Partial<Allocation> = {}): Allocation {
  return {
    id: 'alc1',
    orderId: 'o1',
    productId: 'p1',
    qty: 1,
    lines: [],
    totalKop: 0,
    createdAt: '2026-01-02T10:00:00.000Z',
    createdById: 'u1',
    status: 'active',
    ...overrides,
  }
}

export function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'a1',
    externalId: 'ext-a1',
    title: 'Asset',
    type: 'Скутер',
    brand: 'Brand',
    model: 'Model',
    ...overrides,
  }
}
