import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Ban, Camera, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  canCancelPurchase,
  itemBatch,
  purchaseAllocatedKop,
  purchaseItemTotalKop,
  purchaseStatus,
  purchaseTotalKop,
  purchaseRemainingKop,
  roundQty,
} from '@/domain/calc'
import { AUDIT_ACTION_LABELS } from '@/domain/labels'
import { cancelPurchase } from '@/domain/ops'
import { formatDate, formatDateTime, formatMoney, formatQty } from '@/lib/format'
import { useDb } from '@/store/db-store'
import { useUi } from '@/store/ui-store'

export function PurchaseDetailPage() {
  const { id } = useParams()
  const { db, apply, currentUser, has } = useDb()
  const { toast } = useUi()
  const [cancelOpen, setCancelOpen] = useState(false)

  const purchase = db.purchases.find((item) => item.id === id)

  if (!purchase) {
    return (
      <PageBody>
        <PageHeader title="Закупівлю не знайдено" crumbs={[{ label: 'Закупівлі', to: '/purchases' }]} />
        <EmptyState title="Такої закупівлі немає" />
      </PageBody>
    )
  }

  const supplier = db.suppliers.find((item) => item.id === purchase.supplierId)
  const author = db.users.find((item) => item.id === purchase.createdById)
  const order = purchase.orderId ? db.orders.find((item) => item.id === purchase.orderId) : null
  const status = purchaseStatus(db, purchase)
  const totalKop = purchaseTotalKop(purchase)
  const allocatedKop = purchaseAllocatedKop(db, purchase)
  const remainingKop = purchaseRemainingKop(db, purchase)
  const canCancel = has('purchases.create') && canCancelPurchase(db, purchase)

  const auditEntries = db.audit.filter((entry) => entry.objectId === purchase.id)

  const doCancel = (reason: string) => {
    if (!currentUser) return { ok: false, error: 'Немає користувача.' }
    const result = apply((draft) => cancelPurchase(draft, purchase.id, reason, currentUser.id))
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
        description={supplier ? supplier.name : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PurchaseStatusBadge status={status} />
            <DestinationBadge destination={purchase.destination} />
            {canCancel ? (
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

      {!purchase.cancelled && !canCancelPurchase(db, purchase) && has('purchases.create') ? (
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
                  {purchase.items.map((item) => {
                    const product = db.products.find((candidate) => candidate.id === item.productId)
                    const batch = itemBatch(db, item.id)
                    const allocatedQty = batch ? roundQty(batch.qtyReceived - batch.qtyRemaining) : 0
                    const availableQty = batch ? batch.qtyRemaining : 0
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {product ? (
                            <Link to="/inventory" className="hover:underline">
                              {product.name}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(item.qty, product?.unit)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(item.unitPriceKop)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(purchaseItemTotalKop(item))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatQty(allocatedQty, product?.unit)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(availableQty, product?.unit)}
                        </TableCell>
                        <TableCell className="max-w-40 truncate text-xs text-muted-foreground">
                          {item.note ?? '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
                <span className="text-xl font-semibold tabular-nums">{formatMoney(totalKop)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Розподілено по заявках</span>
                <span className="text-sm tabular-nums">{formatMoney(allocatedKop)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Залишок на складі</span>
                <span className="text-sm tabular-nums">{formatMoney(remainingKop)}</span>
              </div>
              <InfoNote className="mt-2">
                Залишок закупівлі — це і є товар на складі за ціною цієї партії. З розподіленою частиною ці суми не додаються.
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
                <span className="text-right">{supplier ? supplier.name : '—'}</span>
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
                <span>{author ? author.fullName : '—'}</span>
              </div>
              {order ? (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Заявка</span>
                  <Link to={`/orders/${order.id}`} className="hover:underline">
                    № {order.number}
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
          {auditEntries.length === 0 ? (
            <EmptyState title="Записів ще немає" />
          ) : (
            <div className="flex flex-col">
              {auditEntries.map((entry) => {
                const user = db.users.find((item) => item.id === entry.userId)
                return (
                  <div key={entry.id} className="flex flex-col gap-0.5 border-b border-border py-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{AUDIT_ACTION_LABELS[entry.action]}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDateTime(entry.at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {user ? user.fullName : 'Система'}
                      {entry.after ? ` · ${entry.after}` : ''}
                      {entry.reason ? ` · причина: ${entry.reason}` : ''}
                    </p>
                  </div>
                )
              })}
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
