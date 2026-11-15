/**
 * One purchase: its items, finances, document data and history.
 *
 * Everything shown (totals, statuses, "allocated" / "available" per item,
 * whether it can be cancelled) is computed by the server; the page renders
 * it. Cancelling never deletes the purchase: it stays with the status
 * "Скасована" and a mandatory reason.
 */

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Ban, Camera, FileText } from 'lucide-react'
import { useCancelPurchase, usePurchase, useSession } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrap,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState, InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { DestinationBadge, PurchaseStatusBadge } from '@/components/common/status'
import { formatDate, formatDateTime, formatMoney, formatQty } from '@/lib/format'
import { AUDIT_ACTION_LABELS } from '@/lib/labels'
import { useUi } from '@/store/ui-context'

export function PurchaseDetailPage() {
  const { id } = useParams()
  const { data: detail, isLoading } = usePurchase(id)
  const cancelPurchase = useCancelPurchase()
  const { can } = useSession()
  const { toast } = useUi()
  const [cancelOpen, setCancelOpen] = useState(false)

  if (isLoading) {
    return (
      <PageBody>
        <PageHeader title="Закупівля" crumbs={[{ label: 'Закупівлі', to: '/purchases' }]} />
        <Skeleton className="h-64 w-full" />
      </PageBody>
    )
  }

  if (!detail) {
    return (
      <PageBody>
        <PageHeader title="Закупівлю не знайдено" crumbs={[{ label: 'Закупівлі', to: '/purchases' }]} />
        <EmptyState title="Такої закупівлі немає" />
      </PageBody>
    )
  }

  const { purchase } = detail
  const mayManage = can('purchases.create')

  /** Cancels the purchase; the reason is required by the dialog and by the server. */
  const doCancel = async (reason: string) => {
    const result = await cancelPurchase.mutateAsync({ id: purchase.id, reason })
    if (!result.ok) return { ok: false, error: result.error }
    toast('Закупівлю скасовано', {
      description: 'Запис залишився в системі зі статусом «Скасована».',
      tone: 'success',
    })
    return { ok: true }
  }

  return (
    <PageBody>
      <PageHeader
        crumbs={[{ label: 'Закупівлі', to: '/purchases' }, { label: purchase.number }]}
        title={`Закупівля ${purchase.number}`}
        description={detail.supplierName}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PurchaseStatusBadge status={detail.status} />
            <DestinationBadge destination={purchase.destination} />
            {mayManage && detail.canCancel ? (
              <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}>
                <Ban />
                Скасувати
              </Button>
            ) : null}
          </div>
        }
      />

      {purchase.cancelled ? (
        <InfoNote>
          Закупівля скасована. Причина: {purchase.cancelReason ?? '—'}. Фінансові записи не видаляються — запис
          залишається в журналі.
        </InfoNote>
      ) : null}

      {!purchase.cancelled && !detail.canCancel && mayManage ? (
        <InfoNote>
          З цієї закупівлі вже є вкладення, тому скасувати її не можна. Спочатку поверніть вкладення на склад.
        </InfoNote>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Позиції</CardTitle>
          </CardHeader>
          <CardContent>
            <TableWrap>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Товар</TableHead>
                    <TableHead className="text-right">К-сть</TableHead>
                    <TableHead className="text-right">Ціна за од.</TableHead>
                    <TableHead className="text-right">Сума</TableHead>
                    <TableHead className="text-right">Розподілено</TableHead>
                    <TableHead className="text-right">Доступно</TableHead>
                    <TableHead>Примітка</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.items.map((row) => (
                    <TableRow key={row.item.id}>
                      <TableCell className="font-medium">
                        <Link to="/inventory" className="hover:underline">
                          {row.productName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatQty(row.item.qty, row.unit)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(row.item.unitPriceKop)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatMoney(row.totalKop)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatQty(row.allocatedQty, row.unit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatQty(row.availableQty, row.unit)}</TableCell>
                      <TableCell className="max-w-40 truncate text-xs text-muted-foreground">
                        {row.item.note ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Фінанси</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Загальна сума</span>
                <span className="text-xl font-semibold tabular-nums">{formatMoney(detail.totalKop)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Розподілено по заявках</span>
                <span className="text-sm tabular-nums">{formatMoney(detail.allocatedKop)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Залишок на складі</span>
                <span className="text-sm tabular-nums">{formatMoney(detail.remainingKop)}</span>
              </div>
              <InfoNote className="mt-2">
                Залишок закупівлі — це і є товар на складі за ціною цієї партії. З розподіленою частиною ці суми не
                додаються.
              </InfoNote>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Документ</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-muted-foreground">Дата</span>
                <span>{formatDate(purchase.date)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-muted-foreground">Постачальник</span>
                <span className="text-right">{detail.supplierName}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-muted-foreground">Номер документа</span>
                <span className="flex items-center gap-1">
                  <FileText className="size-3 text-muted-foreground" />
                  {purchase.docNumber ?? '—'}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-muted-foreground">Автор</span>
                <span>{detail.createdByName}</span>
              </div>
              {purchase.orderId ? (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Заявка</span>
                  <Link to={`/orders/${purchase.orderId}`} className="hover:underline">
                    № {detail.orderNumber}
                  </Link>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-muted-foreground">Фото чека</span>
                <span className="flex items-center gap-1">
                  <Camera className="size-3 text-muted-foreground" />
                  {purchase.hasReceipt ? 'Додано' : 'Немає'}
                </span>
              </div>
              {purchase.comment ? (
                <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">{purchase.comment}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Історія</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.history.length === 0 ? (
            <EmptyState title="Записів ще немає" />
          ) : (
            <div className="flex flex-col">
              {detail.history.map(({ entry, userName }) => (
                <div key={entry.id} className="flex flex-col gap-0.5 border-b border-border py-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{AUDIT_ACTION_LABELS[entry.action]}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(entry.at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {userName}
                    {entry.after ? ` · ${entry.after}` : ''}
                    {entry.reason ? ` · причина: ${entry.reason}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={cancelOpen}
        title="Скасувати закупівлю?"
        description={purchase.number}
        warning="Запис не видаляється: закупівля отримає статус «Скасована», а партії зі складу знімуться."
        confirmLabel="Скасувати закупівлю"
        tone="destructive"
        requireReason
        reasonLabel="Причина скасування"
        onClose={() => setCancelOpen(false)}
        onConfirm={doCancel}
      />
    </PageBody>
  )
}
