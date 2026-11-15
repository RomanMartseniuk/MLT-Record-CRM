/**
 * Журнал операцій.
 *
 * Кожна змінна операція рушія записує рядок у `db.audit` у тій самій зміні
 * даних, що й сама операція (на сервері — в одній транзакції). Записи
 * журналу ніколи не видаляються.
 */

import type { AuditAction } from '@/api/contract/types'
import { now } from './dates'
import type { Db } from './types'
import { uid } from './util'

/** Що записати в журнал. */
export interface AuditInput {
  userId: string
  action: AuditAction
  objectType: string
  objectId: string
  objectLabel: string
  before?: string
  after?: string
  reason?: string
}

/**
 * Додає запис у журнал.
 * `at` потрібен лише сценарію демо-даних, який «проживає» минулі дні;
 * зазвичай береться поточний час.
 */
export function pushAudit(db: Db, input: AuditInput, at?: string): void {
  db.audit.push({
    id: uid('aud'),
    at: at ?? now(),
    userId: input.userId,
    action: input.action,
    objectType: input.objectType,
    objectId: input.objectId,
    objectLabel: input.objectLabel,
    before: input.before,
    after: input.after,
    reason: input.reason,
  })
}
