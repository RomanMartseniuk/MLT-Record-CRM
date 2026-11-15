import { AlertCircle, Check, CircleDot, Clock, Lock, PackageX } from 'lucide-react'
import { useReference } from '@/api'
import type { AllocationStatus, PurchaseDestination, PurchaseStatus } from '@/api'
import { Badge } from '@/components/ui/badge'
import { ALLOCATION_STATUS_LABELS, DESTINATION_LABELS, PURCHASE_STATUS_LABELS } from '@/lib/labels'

/**
 * Order status from RO App. The raw status is turned into a local code and a
 * label with the RO App status mapping from the reference lists. An unknown
 * status is shown as is with a neutral warning badge.
 */
export function OrderStatusBadge({ rawStatus }: { rawStatus: string }) {
  const { data: reference } = useReference()
  const mapping = reference?.statusMappings.find((item) => item.raw === rawStatus)
  const code = mapping ? mapping.local : null
  const label = mapping ? mapping.label : rawStatus

  // The mapping is still loading: show the raw status quietly instead of a warning.
  if (!reference) return <Badge variant="outline">{rawStatus}</Badge>

  if (code === 'closed') {
    return (
      <Badge variant="secondary">
        <Lock />
        {label}
      </Badge>
    )
  }
  if (code === 'done') {
    return (
      <Badge variant="success">
        <Check />
        {label}
      </Badge>
    )
  }
  if (code === 'inWork') {
    return (
      <Badge variant="default">
        <CircleDot />
        {label}
      </Badge>
    )
  }
  if (code === 'inQueue') {
    return (
      <Badge variant="outline">
        <Clock />
        {label}
      </Badge>
    )
  }
  return (
    <Badge variant="warning" title="Статус із RO App ще не змаплений локально">
      <AlertCircle />
      {label}
    </Badge>
  )
}

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  const label = PURCHASE_STATUS_LABELS[status]
  if (status === 'full') {
    return (
      <Badge variant="success">
        <Check />
        {label}
      </Badge>
    )
  }
  if (status === 'partial') return <Badge variant="default">{label}</Badge>
  if (status === 'cancelled') {
    return (
      <Badge variant="destructive">
        <PackageX />
        {label}
      </Badge>
    )
  }
  return <Badge variant="outline">{label}</Badge>
}

export function DestinationBadge({ destination }: { destination: PurchaseDestination }) {
  return (
    <Badge variant={destination === 'order' ? 'default' : 'outline'}>{DESTINATION_LABELS[destination]}</Badge>
  )
}

export function AllocationStatusBadge({ status }: { status: AllocationStatus }) {
  const label = ALLOCATION_STATUS_LABELS[status]
  if (status === 'active') return <Badge variant="outline">{label}</Badge>
  if (status === 'returned') return <Badge variant="secondary">{label}</Badge>
  return <Badge variant="destructive">{label}</Badge>
}

/** A zero stock does not hide the product: it stays in the list with this badge. */
export function StockBadge({ qty }: { qty: number }) {
  if (qty > 0) {
    return (
      <Badge variant="success">
        <Check />В наявності
      </Badge>
    )
  }
  return (
    <Badge variant="warning">
      <PackageX />
      Немає в наявності
    </Badge>
  )
}
