/**
 * "Add allocation" dialog of an order: put a product into the order.
 *
 * It is a small wizard of three steps, each in its own file:
 *  1. search    — find a product in the warehouse (`search-step.tsx`);
 *  2. allocate  — choose the quantity, see the FIFO price (`allocate-step.tsx`);
 *  3. buy       — nothing suitable in stock: buy it, either straight into this
 *                 order or into the warehouse (`buy-step.tsx`).
 *
 * This file only keeps which step is shown. Mount it only while it is open:
 * every step starts with a clean form on every mount.
 */

import { useState } from 'react'
import type { OrderRow, StockRow } from '@/api'
import { AllocateStep } from './allocate-step'
import { BuyStep } from './buy-step'
import { SearchStep } from './search-step'

type Step =
  | { kind: 'search' }
  | { kind: 'allocate'; row: StockRow }
  /** `existing` is a product without stock to replenish; null means a brand new product. */
  | { kind: 'buy'; existing: StockRow | null }

export function AddAllocationDialog({ order, onClose }: { order: OrderRow; onClose: () => void }) {
  const [step, setStep] = useState<Step>({ kind: 'search' })
  // Kept here so "Back" returns to the same search, and a new product starts with that text as its name.
  const [query, setQuery] = useState('')

  const backToSearch = () => setStep({ kind: 'search' })

  if (step.kind === 'allocate') {
    return <AllocateStep order={order} row={step.row} onBack={backToSearch} onClose={onClose} />
  }

  if (step.kind === 'buy') {
    return (
      <BuyStep
        order={order}
        existing={step.existing}
        initialName={query.trim()}
        onBack={backToSearch}
        onClose={onClose}
      />
    )
  }

  return (
    <SearchStep
      order={order}
      query={query}
      onQueryChange={setQuery}
      onPick={(row) => setStep({ kind: 'allocate', row })}
      onBuyExisting={(row) => setStep({ kind: 'buy', existing: row })}
      onBuyNew={() => setStep({ kind: 'buy', existing: null })}
      onClose={onClose}
    />
  )
}
