/**
 * "Order and equipment" card: what RO App knows about the order, its client
 * and the equipment. Read-only: this system never writes to RO App.
 */

import type { ReactNode } from 'react'
import { Building2, User as UserIcon } from 'lucide-react'
import type { OrderDetail } from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'

/** One "label … value" line of the card. */
function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-1.5 last:border-0">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{value}</span>
    </div>
  )
}

export function OrderInfoCard({ detail }: { detail: OrderDetail }) {
  const { order, client, asset } = detail

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Заявка і техніка</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
        <div>
          <InfoRow label="Техніка" value={asset ? asset.title : '—'} />
          <InfoRow label="Бренд" value={asset ? asset.brand : '—'} />
          <InfoRow label="Модель" value={asset ? asset.model : '—'} />
          <InfoRow label="Модифікація" value={asset?.modification ?? '—'} />
          <InfoRow label="Створено" value={formatDateTime(order.createdAt)} />
        </div>
        <div>
          <InfoRow
            label="Клієнт"
            value={
              <span className="flex items-center justify-end gap-1">
                {client?.isOrganization ? (
                  <Building2 className="size-3 text-muted-foreground" />
                ) : (
                  <UserIcon className="size-3 text-muted-foreground" />
                )}
                {client ? client.name : '—'}
              </span>
            }
          />
          <InfoRow label="Телефон" value={client ? client.phones.join(', ') : '—'} />
          <InfoRow label="Пошта" value={client?.email ?? '—'} />
          <InfoRow label="Менеджер" value={order.managerName} />
          <InfoRow label="Виконавець" value={order.engineerName} />
        </div>
        <div className="sm:col-span-2 sm:pt-4">
          <InfoRow label="Несправність" value={order.malfunction} />
          {order.accessories ? <InfoRow label="Комплектація" value={order.accessories} /> : null}
          {order.managerNotes ? <InfoRow label="Нотатки менеджера" value={order.managerNotes} /> : null}
          {order.engineerNotes ? <InfoRow label="Нотатки виконавця" value={order.engineerNotes} /> : null}
        </div>
      </CardContent>
    </Card>
  )
}
