/**
 * One order: RO App data, the repair cost and the allocations (materials put
 * into this order).
 *
 * The order itself is read-only (it comes from RO App). Everything shown
 * comes from the server: cost, the "locked" flag ("Видано"), allocations with
 * names, prices and source purchases. The page decides what to show and
 * reports user actions; the operations are server calls.
 */

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Lock, Plus } from 'lucide-react'
import { useOrder, useReleaseAllocation, useSession } from '@/api'
import type { AllocationRow } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs } from '@/components/ui/tabs'
import { AddAllocationDialog } from '@/components/allocation/add-allocation-dialog'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState, InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { OrderStatusBadge } from '@/components/common/status'
import { AllocationHistoryTable } from '@/components/orders/allocation-history-table'
import { AllocationsCards, AllocationsTable } from '@/components/orders/allocations-list'
import type { AllocationActions } from '@/components/orders/allocations-list'
import { OrderCostCard } from '@/components/orders/order-cost-card'
import { OrderInfoCard } from '@/components/orders/order-info-card'
import { TransferAllocationDialog } from '@/components/orders/transfer-allocation-dialog'
import { formatDate } from '@/lib/format'
import { useUi } from '@/store/ui-context'

export function OrderDetailPage() {
  const { id } = useParams()
  const { data: detail, isLoading } = useOrder(id)
  const releaseAllocation = useReleaseAllocation()
  const { can } = useSession()
  const { isMobile, toast } = useUi()

  const [tab, setTab] = useState('allocations')
  const [addOpen, setAddOpen] = useState(false)
  const [transferFor, setTransferFor] = useState<AllocationRow | null>(null)
  const [releaseFor, setReleaseFor] = useState<{ row: AllocationRow; mode: 'returned' | 'cancelled' } | null>(null)

  if (isLoading) {
    return (
      <PageBody>
        <PageHeader title="Заявка" crumbs={[{ label: 'Заявки', to: '/orders' }]} />
        <Skeleton className="h-64 w-full" />
      </PageBody>
    )
  }

  if (!detail) {
    return (
      <PageBody>
        <PageHeader title="Заявку не знайдено" crumbs={[{ label: 'Заявки', to: '/orders' }]} />
        <EmptyState
          title="Такої заявки немає"
          description="Можливо, вона ще не синхронізована з RO App."
          action={
            <Link to="/orders">
              <Button variant="outline" size="sm">
                До списку заявок
              </Button>
            </Link>
          }
        />
      </PageBody>
    )
  }

  const { order, locked } = detail
  // An issued order can be changed only by someone with the special permission.
  const canEdit = locked ? can('allocations.edit_closed') : can('allocations.create')

  const actions: AllocationActions = {
    onTransfer: setTransferFor,
    onRelease: (row, mode) => setReleaseFor({ row, mode }),
  }

  /** Returns the allocation to the warehouse or cancels it; a reason is required for a closed order. */
  const doRelease = async (reason: string) => {
    if (!releaseFor) return { ok: false, error: 'Немає даних для операції.' }
    const result = await releaseAllocation.mutateAsync({
      id: releaseFor.row.allocation.id,
      mode: releaseFor.mode,
      reason: reason || undefined,
    })
    if (!result.ok) return { ok: false, error: result.error }
    toast(releaseFor.mode === 'returned' ? 'Повернуто на склад' : 'Вкладення скасовано', {
      description: 'Кількість і вартість повернулись у ті самі партії, з яких були взяті.',
      tone: 'success',
    })
    return { ok: true }
  }

  return (
    <PageBody>
      <PageHeader
        crumbs={[{ label: 'Заявки', to: '/orders' }, { label: `№ ${order.number}` }]}
        title={`Заявка № ${order.number}`}
        description={detail.asset ? detail.asset.title : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge rawStatus={order.rawStatus} />
            <Badge variant="outline">{detail.typeName}</Badge>
            <Badge variant="outline">Здати до {formatDate(order.dueDate)}</Badge>
          </div>
        }
      />

      {locked ? (
        <InfoNote>
          <Lock className="mr-1 inline size-3" />
          {canEdit
            ? 'Заявка закрита. Ви можете змінювати вкладення, бо маєте право «Зміна вкладень у закритій заявці». Кожна зміна вимагає причини й потрапляє в журнал.'
            : 'Заявка закрита — вкладення доступні лише для перегляду. Зміни може робити адміністратор або користувач з індивідуальним правом.'}
        </InfoNote>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <OrderInfoCard detail={detail} />
        <OrderCostCard detail={detail} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-0">
          <Tabs
            value={tab}
            onValueChange={setTab}
            className="border-0"
            items={[
              {
                value: 'allocations',
                label: 'Вкладення',
                badge: <Badge variant="outline">{detail.allocations.length}</Badge>,
              },
              { value: 'history', label: 'Історія', badge: <Badge variant="outline">{detail.history.length}</Badge> },
            ]}
          />
          {tab === 'allocations' ? (
            <Button
              size={isMobile ? 'touch' : 'default'}
              onClick={() => setAddOpen(true)}
              disabled={!canEdit}
              title={canEdit ? undefined : 'Немає прав на зміну вкладень цієї заявки'}
            >
              <Plus />
              Додати вкладення
            </Button>
          ) : null}
        </div>

        <CardContent className="pt-4">
          {tab === 'history' ? (
            <AllocationHistoryTable rows={detail.history} />
          ) : detail.allocations.length === 0 ? (
            <EmptyState
              title="Вкладень ще немає"
              description="Додайте запчастину або матеріал зі складу — ціна порахується автоматично за FIFO."
              action={
                canEdit ? (
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    <Plus />
                    Додати вкладення
                  </Button>
                ) : null
              }
            />
          ) : isMobile ? (
            <AllocationsCards rows={detail.allocations} canEdit={canEdit} actions={actions} />
          ) : (
            <AllocationsTable rows={detail.allocations} canEdit={canEdit} actions={actions} />
          )}
        </CardContent>
      </Card>

      {/* Dialogs are mounted only while open, so each one starts with a clean form. */}
      {addOpen ? <AddAllocationDialog order={detail} onClose={() => setAddOpen(false)} /> : null}
      {transferFor ? (
        <TransferAllocationDialog order={detail} row={transferFor} onClose={() => setTransferFor(null)} />
      ) : null}

      <ConfirmDialog
        open={Boolean(releaseFor)}
        title={releaseFor?.mode === 'returned' ? 'Повернути на склад?' : 'Скасувати вкладення?'}
        description={releaseFor?.row.productName}
        warning="Кількість і вартість повернуться саме в ті партії, з яких були взяті. Повторних витрат не виникне."
        confirmLabel={releaseFor?.mode === 'returned' ? 'Повернути' : 'Скасувати вкладення'}
        tone={releaseFor?.mode === 'cancelled' ? 'destructive' : 'default'}
        requireReason={locked}
        onClose={() => setReleaseFor(null)}
        onConfirm={doRelease}
      />
    </PageBody>
  )
}
