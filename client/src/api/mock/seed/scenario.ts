/**
 * The demo history: purchases and allocations replayed in chronological order,
 * plus the synchronisation log.
 *
 * The history is replayed with the SAME engine operations the UI uses, so the
 * demo data obeys the real rules (FIFO, no negative stock, price kept per
 * batch…). If an event were invalid the engine would refuse it.
 */

import type { SyncSource } from '@/api/contract/types'
import { addAllocation } from '../engine/allocations'
import { cancelPurchase, createPurchase } from '../engine/purchases'
import type { Db } from '../engine/types'
import { uid } from '../engine/util'
import { daysAgo } from './time'

interface PurchaseEvent {
  kind: 'purchase'
  /** How many days ago it happened. */
  day: number
  supplierId: string
  destination: 'warehouse' | 'order'
  orderId?: string
  docNumber?: string
  hasReceipt?: boolean
  comment?: string
  userId: string
  /** Prices are in kopecks. */
  items: { productId: string; qty: number; price: number }[]
  /** If set, the purchase is cancelled right after with this reason. */
  cancelAfter?: string
}

interface AllocationEvent {
  kind: 'allocation'
  day: number
  orderId: string
  productId: string
  qty: number
  userId: string
}

type SeedEvent = PurchaseEvent | AllocationEvent

/** The scenario in chronological order. */
const TIMELINE: SeedEvent[] = [
  { kind: 'purchase', day: 70, supplierId: 's1', destination: 'warehouse', docNumber: 'НК-10244', hasReceipt: true, userId: 'u_admin', items: [
    { productId: 'p_carb', qty: 4, price: 115000 },
    { productId: 'p_plug', qty: 20, price: 9500 },
    { productId: 'p_oil', qty: 10, price: 32000 },
  ] },
  { kind: 'allocation', day: 66, orderId: 'o1', productId: 'p_carb', qty: 1, userId: 'u_master' },
  { kind: 'allocation', day: 65, orderId: 'o1', productId: 'p_plug', qty: 2, userId: 'u_master' },
  { kind: 'allocation', day: 64, orderId: 'o1', productId: 'p_oil', qty: 0.8, userId: 'u_master' },
  { kind: 'purchase', day: 62, supplierId: 's2', destination: 'warehouse', docNumber: 'НК-10301', hasReceipt: true, userId: 'u_admin', items: [
    { productId: 'p_chain', qty: 6, price: 48000 },
    { productId: 'p_sprocket', qty: 4, price: 26000 },
    { productId: 'p_gasket', qty: 12, price: 5500 },
  ] },
  { kind: 'allocation', day: 60, orderId: 'o2', productId: 'p_chain', qty: 1, userId: 'u_master2' },
  { kind: 'allocation', day: 58, orderId: 'o2', productId: 'p_gasket', qty: 2, userId: 'u_master2' },
  { kind: 'allocation', day: 55, orderId: 'o3', productId: 'p_carb', qty: 1, userId: 'u_master' },
  { kind: 'allocation', day: 52, orderId: 'o3', productId: 'p_sprocket', qty: 1, userId: 'u_master' },
  { kind: 'purchase', day: 50, supplierId: 's3', destination: 'warehouse', hasReceipt: true, comment: 'Витратні матеріали на місяць', userId: 'u_master', items: [
    { productId: 'p_airfilter', qty: 8, price: 18000 },
    { productId: 'p_cleaner', qty: 6, price: 14500 },
    { productId: 'p_grease', qty: 3, price: 21000 },
  ] },
  { kind: 'allocation', day: 48, orderId: 'o4', productId: 'p_airfilter', qty: 1, userId: 'u_master' },
  { kind: 'allocation', day: 45, orderId: 'o5', productId: 'p_chain', qty: 1, userId: 'u_master2' },
  { kind: 'allocation', day: 44, orderId: 'o5', productId: 'p_cleaner', qty: 1, userId: 'u_master2' },
  { kind: 'purchase', day: 41, supplierId: 's1', destination: 'warehouse', docNumber: 'НК-10488', hasReceipt: true, comment: 'Ціна піднялася порівняно з попередньою партією', userId: 'u_admin', items: [
    { productId: 'p_carb', qty: 3, price: 129000 },
    { productId: 'p_belt', qty: 5, price: 33000 },
  ] },
  { kind: 'allocation', day: 38, orderId: 'o6', productId: 'p_carb', qty: 2, userId: 'u_master' },
  { kind: 'allocation', day: 36, orderId: 'o6', productId: 'p_belt', qty: 1, userId: 'u_master' },
  { kind: 'purchase', day: 33, supplierId: 's4', destination: 'warehouse', docNumber: 'EC-7781', userId: 'u_admin', items: [
    { productId: 'p_coil', qty: 3, price: 86000 },
    { productId: 'p_regulator', qty: 2, price: 54000 },
    { productId: 'p_wire', qty: 10, price: 4800 },
  ] },
  { kind: 'allocation', day: 30, orderId: 'o9', productId: 'p_oil', qty: 1.5, userId: 'u_master2' },
  { kind: 'allocation', day: 28, orderId: 'o11', productId: 'p_carb', qty: 2, userId: 'u_master' },
  { kind: 'allocation', day: 26, orderId: 'o11', productId: 'p_coil', qty: 1, userId: 'u_master' },
  { kind: 'purchase', day: 24, supplierId: 's5', destination: 'warehouse', docNumber: 'ДД-2210', hasReceipt: true, userId: 'u_admin', items: [
    { productId: 'p_piston', qty: 2, price: 168000 },
    { productId: 'p_bearing', qty: 10, price: 8500 },
    { productId: 'p_connector', qty: 30, price: 1200 },
  ] },
  { kind: 'allocation', day: 22, orderId: 'o12', productId: 'p_piston', qty: 1, userId: 'u_master2' },
  { kind: 'allocation', day: 20, orderId: 'o12', productId: 'p_bearing', qty: 2, userId: 'u_master2' },
  { kind: 'allocation', day: 19, orderId: 'o12', productId: 'p_sprocket', qty: 3, userId: 'u_master2' },
  { kind: 'purchase', day: 17, supplierId: 's1', destination: 'order', orderId: 'o4', comment: 'Куплено під конкретний ремонт, на склад не заводимо', hasReceipt: true, userId: 'u_master', items: [
    { productId: 'p_pullcord', qty: 3, price: 6000 },
  ] },
  { kind: 'allocation', day: 16, orderId: 'o4', productId: 'p_gasket', qty: 1, userId: 'u_master' },
  { kind: 'allocation', day: 14, orderId: 'o14', productId: 'p_oil', qty: 2.5, userId: 'u_master2' },
  { kind: 'purchase', day: 12, supplierId: 's2', destination: 'warehouse', docNumber: 'НК-10902', hasReceipt: true, userId: 'u_admin', items: [
    { productId: 'p_oil', qty: 12, price: 34500 },
    { productId: 'p_plug', qty: 15, price: 10200 },
  ] },
  { kind: 'allocation', day: 10, orderId: 'o14', productId: 'p_wire', qty: 3, userId: 'u_master2' },
  { kind: 'purchase', day: 9, supplierId: 's5', destination: 'warehouse', docNumber: 'ДД-2301', userId: 'u_admin', items: [
    { productId: 'p_bearing', qty: 5, price: 9000 },
  ], cancelAfter: 'Постачальник не підтвердив наявність, замовлення скасоване' },
  { kind: 'purchase', day: 8, supplierId: 's3', destination: 'warehouse', hasReceipt: true, userId: 'u_master', items: [
    { productId: 'p_screwdriver', qty: 1, price: 125000 },
    { productId: 'p_cleaner', qty: 4, price: 15800 },
  ] },
  { kind: 'allocation', day: 7, orderId: 'o5', productId: 'p_plug', qty: 3, userId: 'u_master2' },
  { kind: 'allocation', day: 6, orderId: 'o16', productId: 'p_connector', qty: 4, userId: 'u_master2' },
  { kind: 'purchase', day: 4, supplierId: 's4', destination: 'order', orderId: 'o9', docNumber: 'EC-8044', userId: 'u_master2', items: [
    { productId: 'p_coil', qty: 1, price: 91000 },
  ] },
  { kind: 'allocation', day: 3, orderId: 'o9', productId: 'p_cleaner', qty: 2, userId: 'u_master2' },
  { kind: 'allocation', day: 2, orderId: 'o11', productId: 'p_oil', qty: 4, userId: 'u_master' },
  { kind: 'allocation', day: 1, orderId: 'o6', productId: 'p_carb', qty: 1, userId: 'u_master' },
  // Spans two batches of oil: 1.2 l at the old price, the rest at the new one.
  { kind: 'allocation', day: 0, orderId: 'o13', productId: 'p_oil', qty: 3, userId: 'u_master' },
]

/** Replays the whole history on the database with the real engine operations. */
export function runScenario(db: Db): void {
  for (const event of TIMELINE) {
    if (event.kind === 'purchase') {
      const result = createPurchase(
        db,
        {
          date: daysAgo(event.day, 10, 40),
          supplierId: event.supplierId,
          docNumber: event.docNumber,
          comment: event.comment,
          hasReceipt: event.hasReceipt,
          destination: event.destination,
          orderId: event.orderId,
          items: event.items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            unitPriceKop: item.price,
          })),
        },
        event.userId,
      )
      if (result.ok && event.cancelAfter) {
        cancelPurchase(db, result.value.purchaseId, event.cancelAfter, 'u_admin')
      }
    } else {
      addAllocation(
        db,
        {
          orderId: event.orderId,
          productId: event.productId,
          qty: event.qty,
          at: daysAgo(event.day, 15, 10),
        },
        event.userId,
      )
    }
  }
}

interface SyncSeed {
  day: number
  hour: number
  source: SyncSource
  ok: boolean
  added: number
  updated: number
  message: string
}

const SYNC_SEED: SyncSeed[] = [
  { day: 0, hour: 3, source: 'nightly', ok: true, added: 0, updated: 16, message: 'Нічне оновлення: заявки, клієнти, техніка, довідники.' },
  { day: 0, hour: 9, source: 'webhook', ok: true, added: 0, updated: 1, message: 'Заявка 4216: створено в RO App.' },
  { day: 1, hour: 3, source: 'nightly', ok: true, added: 1, updated: 15, message: 'Нічне оновлення: додано 1 заявку.' },
  { day: 1, hour: 14, source: 'manual', ok: true, added: 0, updated: 16, message: 'Глобальне оновлення, запущене адміністратором.' },
  // A failed run, to show the "RO App unavailable, working on loaded data" case.
  { day: 2, hour: 3, source: 'nightly', ok: false, added: 0, updated: 0, message: 'RO App недоступний: таймаут зʼєднання. Система продовжила працювати на вже завантажених даних.' },
  { day: 2, hour: 11, source: 'webhook', ok: true, added: 0, updated: 1, message: 'Заявка 4214: статус змінено на «in-progress».' },
]

/** Adds the synchronisation log, newest first. */
export function seedSyncLog(db: Db): void {
  for (const entry of SYNC_SEED) {
    db.syncLog.push({
      id: uid('syn'),
      at: daysAgo(entry.day, entry.hour, 5),
      source: entry.source,
      ok: entry.ok,
      added: entry.added,
      updated: entry.updated,
      message: entry.message,
    })
  }
  db.syncLog.sort((a, b) => (a.at < b.at ? 1 : -1))
}
