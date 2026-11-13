import { AlertCircle, Check, CircleDot, Clock, Lock, PackageX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  ALLOCATION_STATUS_LABELS,
  DESTINATION_LABELS,
  PURCHASE_STATUS_LABELS,
  orderStatusCode,
  orderStatusLabel,
} from '@/domain/labels'
import { useDb } from '@/store/db-store'
import type { AllocationStatus, PurchaseDestination, PurchaseStatus } from '@/domain/types'

/** Статус заявки з RO App. Невідоме значення показуємо як є, нейтральним бейджем. */
export function OrderStatusBadge({ rawStatus }: { rawStatus: string }) {
  const { db } = useDb()
  const code = orderStatusCode(db, rawStatus)
  const label = orderStatusLabel(db, rawStatus)

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

/** Нульовий залишок не ховає товар — він лишається в списку з цією позначкою. */
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
