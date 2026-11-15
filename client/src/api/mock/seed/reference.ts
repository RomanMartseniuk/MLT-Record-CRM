/**
 * Reference data "read from RO App": order types and the status mapping.
 */

import type { OrderType, StatusMapping } from '@/api/contract/types'

export const ORDER_TYPES: OrderType[] = [
  { id: 'ot_paid', name: 'Платний' },
  { id: 'ot_warranty', name: 'Гарантійний' },
  { id: 'ot_internal', name: 'Внутрішній' },
  { id: 'ot_free', name: 'Безкоштовний' },
]

/**
 * The status dictionary read from RO App. "on-hold" is deliberately NOT
 * mapped, to show that an unknown status is displayed as is and breaks nothing.
 */
export const STATUS_MAPPINGS: StatusMapping[] = [
  { raw: 'in-queue', local: 'inQueue', label: 'В черзі' },
  { raw: 'in-progress', local: 'inWork', label: 'В роботі' },
  { raw: 'ready', local: 'done', label: 'Готово' },
  { raw: 'closed', local: 'closed', label: 'Видано' },
]
