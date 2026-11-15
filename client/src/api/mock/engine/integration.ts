/**
 * Інтеграція з RO App (СИМУЛЯЦІЯ).
 *
 * УВАГА: цей файл НЕ переноситься на сервер. На реальному сервері його
 * замінює справжній клієнт RO App з однією функцією синхронізації (крок 9
 * docs/03-backend-plan.md). Тут лише імітація, щоб прототип можна було
 * показати: вона просуває статус випадкової заявки й пише журнал.
 *
 * Правила, які лишаються й на сервері:
 * - усі три способи оновлення (вебхук, кнопка, нічний запуск) йдуть через
 *   одну логіку й позначаються джерелом у журналі синхронізації;
 * - у RO App нічого не записується, дані лише читаються.
 */

import type { SyncResult } from '@/api/contract/dto'
import type { ApiResult } from '@/api/contract/result'
import type { SyncSource } from '@/api/contract/types'
import { pushAudit } from './audit'
import { now } from './dates'
import { ok } from './result'
import type { Db } from './types'
import { uid } from './util'

/** Куди «просувається» статус при події вебхука: черга → робота → готово → видано. */
const STATUS_FLOW: Record<string, string> = {
  'in-queue': 'in-progress',
  'in-progress': 'ready',
  ready: 'closed',
}

/**
 * Імітує оновлення даних з RO App.
 * Вебхук змінює статус однієї випадкової заявки; кнопка й нічний запуск
 * «перечитують» усі заявки (змінюється лише час синхронізації).
 */
export function syncRoApp(db: Db, source: SyncSource, userId: string): ApiResult<SyncResult> {
  const at = now()
  const added = 0
  let updated: number

  if (source === 'webhook') {
    const candidates = db.orders.filter((order) => STATUS_FLOW[order.rawStatus] !== undefined)
    if (candidates.length === 0) {
      db.syncLog.unshift({
        id: uid('syn'),
        at,
        source,
        ok: true,
        added: 0,
        updated: 0,
        message: 'Подія без змін: усі заявки вже видані.',
      })
      db.lastSyncAt = at
      return ok({ added: 0, updated: 0 })
    }
    const order = candidates[Math.floor(Math.random() * candidates.length)]
    order.rawStatus = STATUS_FLOW[order.rawStatus]
    order.syncedAt = at
    updated = 1
    db.syncLog.unshift({
      id: uid('syn'),
      at,
      source,
      ok: true,
      added: 0,
      updated,
      message: `Заявка ${order.number}: новий статус «${order.rawStatus}».`,
    })
  } else {
    for (const order of db.orders) order.syncedAt = at
    updated = db.orders.length
    db.syncLog.unshift({
      id: uid('syn'),
      at,
      source,
      ok: true,
      added,
      updated,
      message: 'Оновлено заявки, клієнтів і техніку. Довідники статусів і типів перечитано.',
    })
  }

  db.lastSyncAt = at
  pushAudit(db, {
    userId,
    action: 'integration.sync',
    objectType: 'RO App',
    objectId: 'integration',
    objectLabel: source === 'webhook' ? 'Вебхук' : source === 'nightly' ? 'Нічний запуск' : 'Глобальне оновлення',
    after: `додано ${added}, оновлено ${updated}`,
  })

  return ok({ added, updated })
}
