/**
 * The orders of the demo data, as RO App would deliver them.
 *
 * While the demo history is replayed every order is open ("in-progress"); the
 * final statuses (issued, ready, on hold…) are applied afterwards, because the
 * history includes allocations that an issued order would refuse.
 */

import type { Order } from '@/api/contract/types'
import type { Db } from '../engine/types'
import { daysAgo } from './time'

interface OrderSeed {
  id: string
  number: string
  /** The status the order ends up with (a raw RO App status string). */
  finalStatus: string
  typeId: string
  createdDaysAgo: number
  dueInDays: number
  clientId: string
  assetId: string
  manager: string
  engineer: string
  malfunction: string
  managerNotes?: string
  engineerNotes?: string
  accessories?: string
}

const ORDER_SEEDS: OrderSeed[] = [
  { id: 'o1', number: '4201', finalStatus: 'closed', typeId: 'ot_paid', createdDaysAgo: 72, dueInDays: -64, clientId: 'c2', assetId: 'a1', manager: 'Оксана Л.', engineer: 'Андрій К.', malfunction: 'Не тримає обороти, глохне на холостому ходу', accessories: 'Ключі, чохол', engineerNotes: 'Замінено карбюратор і свічку, виставлено холостий хід' },
  { id: 'o2', number: '4202', finalStatus: 'closed', typeId: 'ot_paid', createdDaysAgo: 68, dueInDays: -58, clientId: 'c1', assetId: 'a3', manager: 'Оксана Л.', engineer: 'Ігор Ш.', malfunction: 'Ланцюг зіскакує, сильна вібрація', engineerNotes: 'Замінено ланцюг і прокладки' },
  { id: 'o3', number: '4203', finalStatus: 'ready', typeId: 'ot_warranty', createdDaysAgo: 60, dueInDays: -50, clientId: 'c4', assetId: 'a2', manager: 'Оксана Л.', engineer: 'Андрій К.', malfunction: 'Втрата потужності після 40 км/год', managerNotes: 'Гарантія до 14.08' },
  { id: 'o4', number: '4204', finalStatus: 'in-progress', typeId: 'ot_paid', createdDaysAgo: 52, dueInDays: 3, clientId: 'c5', assetId: 'a7', manager: 'Оксана Л.', engineer: 'Андрій К.', malfunction: 'Не запускається, обрив шнура стартера', accessories: 'Ніж, кошик для трави' },
  { id: 'o5', number: '4205', finalStatus: 'in-progress', typeId: 'ot_paid', createdDaysAgo: 47, dueInDays: 2, clientId: 'c3', assetId: 'a4', manager: 'Оксана Л.', engineer: 'Ігор Ш.', malfunction: 'Димить, падає потужність під навантаженням' },
  { id: 'o6', number: '4206', finalStatus: 'in-progress', typeId: 'ot_paid', createdDaysAgo: 40, dueInDays: 1, clientId: 'c6', assetId: 'a1', manager: 'Оксана Л.', engineer: 'Андрій К.', malfunction: 'Переливає паливо, чорний нагар на свічці' },
  { id: 'o7', number: '4207', finalStatus: 'in-queue', typeId: 'ot_free', createdDaysAgo: 34, dueInDays: 5, clientId: 'c7', assetId: 'a9', manager: 'Оксана Л.', engineer: 'Ігор Ш.', malfunction: 'Діагностика після падіння' },
  { id: 'o8', number: '4208', finalStatus: 'in-queue', typeId: 'ot_paid', createdDaysAgo: 31, dueInDays: 6, clientId: 'c8', assetId: 'a8', manager: 'Оксана Л.', engineer: 'Андрій К.', malfunction: 'Не вмикається, пошкоджений кабель живлення' },
  { id: 'o9', number: '4209', finalStatus: 'in-progress', typeId: 'ot_paid', createdDaysAgo: 29, dueInDays: 2, clientId: 'c1', assetId: 'a5', manager: 'Оксана Л.', engineer: 'Ігор Ш.', malfunction: 'Немає іскри, не заводиться', managerNotes: 'Клієнт просить зателефонувати перед ремонтом' },
  { id: 'o10', number: '4210', finalStatus: 'in-queue', typeId: 'ot_internal', createdDaysAgo: 26, dueInDays: 9, clientId: 'c5', assetId: 'a12', manager: 'Роман М.', engineer: 'Андрій К.', malfunction: 'Планове обслуговування власного обладнання' },
  { id: 'o11', number: '4211', finalStatus: 'in-progress', typeId: 'ot_paid', createdDaysAgo: 23, dueInDays: 1, clientId: 'c9', assetId: 'a1', manager: 'Оксана Л.', engineer: 'Андрій К.', malfunction: 'Не тримає обороти, слабка іскра' },
  { id: 'o12', number: '4212', finalStatus: 'ready', typeId: 'ot_paid', createdDaysAgo: 21, dueInDays: -2, clientId: 'c10', assetId: 'a11', manager: 'Оксана Л.', engineer: 'Ігор Ш.', malfunction: 'Стук у двигуні, втрата компресії', engineerNotes: 'Замінено поршневий комплект і підшипники' },
  { id: 'o13', number: '4213', finalStatus: 'in-queue', typeId: 'ot_paid', createdDaysAgo: 15, dueInDays: 4, clientId: 'c3', assetId: 'a6', manager: 'Оксана Л.', engineer: 'Андрій К.', malfunction: 'Потрібна заміна оливи та фільтрів' },
  { id: 'o14', number: '4214', finalStatus: 'in-progress', typeId: 'ot_paid', createdDaysAgo: 16, dueInDays: 1, clientId: 'c2', assetId: 'a10', manager: 'Оксана Л.', engineer: 'Ігор Ш.', malfunction: 'Пропадає іскра на гарячому двигуні' },
  { id: 'o15', number: '4215', finalStatus: 'on-hold', typeId: 'ot_warranty', createdDaysAgo: 11, dueInDays: 8, clientId: 'c4', assetId: 'a4', manager: 'Оксана Л.', engineer: 'Андрій К.', malfunction: 'Очікуємо рішення виробника по гарантії', managerNotes: 'Статус із RO App поки не змаплений локально' },
  { id: 'o16', number: '4216', finalStatus: 'in-queue', typeId: 'ot_paid', createdDaysAgo: 6, dueInDays: 7, clientId: 'c7', assetId: 'a12', manager: 'Оксана Л.', engineer: 'Ігор Ш.', malfunction: 'Обрив у клемній колодці' },
]

/** Builds the orders, all open for now (see the file header). */
export function buildOrders(): Order[] {
  return ORDER_SEEDS.map((seed) => ({
    id: seed.id,
    externalId: `ro-o-${seed.number}`,
    number: seed.number,
    rawStatus: 'in-progress',
    typeId: seed.typeId,
    createdAt: daysAgo(seed.createdDaysAgo, 9, 15),
    dueDate: daysAgo(-seed.dueInDays, 18, 0),
    clientId: seed.clientId,
    assetId: seed.assetId,
    managerName: seed.manager,
    engineerName: seed.engineer,
    malfunction: seed.malfunction,
    managerNotes: seed.managerNotes,
    engineerNotes: seed.engineerNotes,
    accessories: seed.accessories,
    syncedAt: daysAgo(0, 3, 0),
  }))
}

/** Gives every order its final status (and the "done"/"closed" dates that go with it). */
export function applyFinalStatuses(db: Db): void {
  for (const seed of ORDER_SEEDS) {
    const order = db.orders.find((item) => item.id === seed.id)
    if (!order) continue
    order.rawStatus = seed.finalStatus
    if (seed.finalStatus === 'ready' || seed.finalStatus === 'closed') {
      order.doneAt = daysAgo(Math.max(1, seed.createdDaysAgo - 12), 16, 30)
    }
    if (seed.finalStatus === 'closed') {
      order.closedAt = daysAgo(Math.max(1, seed.createdDaysAgo - 10), 17, 10)
    }
  }
}
