/**
 * Mock handler of the `allocations` module: putting products into orders,
 * returning them, cancelling and moving them between orders.
 *
 * The price of an allocation is never sent by the client: the engine takes
 * it from the warehouse batches by FIFO.
 */

import type { AllocationsApi } from '../../contract/client'
import { addAllocation, releaseAllocation, transferAllocation } from '../engine/allocations'
import { delay } from '../latency'
import { runAsActor } from './session'

export const allocationsApi: AllocationsApi = {
  async add(input) {
    await delay()
    return runAsActor((draft, userId) => addAllocation(draft, input, userId))
  },

  async release(id, mode, reason) {
    await delay()
    return runAsActor((draft, userId) => releaseAllocation(draft, id, mode, userId, reason))
  },

  async transfer(id, toOrderId, reason) {
    await delay()
    return runAsActor((draft, userId) => transferAllocation(draft, id, toOrderId, userId, reason))
  },
}
