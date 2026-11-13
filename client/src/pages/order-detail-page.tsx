import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRightLeft,
  Building2,
  Lock,
  MoreHorizontal,
  Plus,
  Trash2,
  Undo2,
  User as UserIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { DropdownItem, DropdownMenu } from '@/components/ui/dropdown-menu'
import { Field, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableWrap,
} from '@/components/ui/table'
import { AddAllocationDialog } from '@/components/allocation/add-allocation-dialog'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState, ErrorNote, InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { AllocationStatusBadge, OrderStatusBadge } from '@/components/common/status'
import { HorizontalBars } from '@/components/common/charts'
import { orderAllocationHistory, orderAllocations, orderCostByCategory, orderCostKop } from '@/domain/calc'
import { isOrderLocked, orderTypeName } from '@/domain/labels'
import { releaseAllocation, transferAllocation } from '@/domain/ops'
import { formatDate, formatDateTime, formatMoney, formatQty } from '@/lib/format'
import { useDb } from '@/store/db-store'
import { useUi } from '@/store/ui-store'
import type { Allocation, Order } from '@/domain/types'

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-1.5 last:border-0">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{value}</span>
    </div>
  )
}

function TransferDialog({
  open,
  onClose,
  allocation,
  order,
}: {
  open: boolean
  onClose: () => void
  allocation: Allocation | null
  order: Order
}) {
  const { db, apply, currentUser } = useDb()
  const { toast } = useUi()
  const [targetId, setTargetId] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const locked = isOrderLocked(db, order.rawStatus)
  const product = allocation ? db.products.find((item) => item.id === allocation.productId) : null

  const options = db.orders
    .filter((item) => item.id !== order.id)
    .map((item) => ({ value: item.id, label: `№ ${item.number} · ${item.malfunction.slice(0, 40)}` }))

  const submit = () => {
    if (!allocation || !currentUser) return
    if (!targetId) {
      setError('Виберіть заявку, на яку переносимо.')
      return
    }
    const result = apply((draft) =>
      transferAllocation(draft, allocation.id, targetId, currentUser.id, reason.trim() || undefined),
    )
    if (!result.ok) {
      setError(result.error)
      return
    }
    const target = db.orders.find((item) => item.id === targetId)
    toast('Вкладення перенесено', {
      description: `${product?.name} → заявка № ${target?.number}. Загальна сума закупівель не змінилась.`,
      tone: 'success',
    })
    setTargetId('')
    setReason('')
    setError('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Перенести на іншу заявку"
      description={product ? product.name : undefined}
      width="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button onClick={submit}>Перенести</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <InfoNote>
          Перенесення не змінює склад і не створює повторної закупівлі: ціна партії зберігається, а загальна сума
          закупівель залишається тією самою.
        </InfoNote>
        <Field label="Заявка-отримувач">
          <Select
            value={targetId}
            onValueChange={setTargetId}
            options={options}
            placeholder="Виберіть заявку"
          />
        </Field>
        {locked ? (
          <Field label="Причина зміни" hint="Обовʼязково для закритої заявки">
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
        ) : null}
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Dialog>
  )
}

export function OrderDetailPage() {
  const { id } = useParams()
  const { db, apply, currentUser, has } = useDb()
  const { isMobile, toast } = useUi()

  const [tab, setTab] = useState('allocations')
  const [addOpen, setAddOpen] = useState(false)
  const [transferFor, setTransferFor] = useState<Allocation | null>(null)
  const [releaseFor, setReleaseFor] = useState<{ allocation: Allocation; mode: 'returned' | 'cancelled' } | null>(
    null,
  )

  const order = db.orders.find((item) => item.id === id)

  const allocations = useMemo(() => (order ? orderAllocations(db, order.id) : []), [db, order])
  const history = useMemo(() => (order ? orderAllocationHistory(db, order.id) : []), [db, order])
  const byCategory = useMemo(() => (order ? orderCostByCategory(db, order.id) : []), [db, order])

  if (!order) {
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

  const client = db.clients.find((item) => item.id === order.clientId)
  const asset = db.assets.find((item) => item.id === order.assetId)
  const costKop = orderCostKop(db, order.id)
  const locked = isOrderLocked(db, order.rawStatus)
  const canEdit = locked ? has('allocations.edit_closed') : has('allocations.create')

  const doRelease = (reason: string) => {
    if (!releaseFor || !currentUser) return { ok: false, error: 'Немає даних для операції.' }
    const result = apply((draft) =>
      releaseAllocation(draft, releaseFor.allocation.id, releaseFor.mode, currentUser.id, reason || undefined),
    )
    if (!result.ok) return { ok: false, error: result.error }
    toast(releaseFor.mode === 'returned' ? 'Повернуто на склад' : 'Вкладення скасовано', {
      description: 'Кількість і вартість повернулись у ті самі партії, з яких були взяті.',
      tone: 'success',
    })
    setReleaseFor(null)
    return { ok: true }
  }

  return (
    <PageBody>
      <PageHeader
        crumbs={[{ label: 'Заявки', to: '/orders' }, { label: `№ ${order.number}` }]}
        title={`Заявка № ${order.number}`}
        description={asset ? asset.title : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge rawStatus={order.rawStatus} />
            <Badge variant="outline">{orderTypeName(db, order.typeId)}</Badge>
            <Badge variant="outline">Здати до {formatDate(order.dueDate)}</Badge>
          </div>
        }
      />

      {locked ? (
        <InfoNote>
          {canEdit ? (
            <>
              <Lock className="mr-1 inline size-3" />
              Заявка закрита. Ви можете змінювати вкладення, бо маєте право «Зміна вкладень у закритій заявці».
              Кожна зміна вимагає причини й потрапляє в журнал.
            </>
          ) : (
            <>
              <Lock className="mr-1 inline size-3" />
              Заявка закрита — вкладення доступні лише для перегляду. Зміни може робити адміністратор або
              користувач з індивідуальним правом.
            </>
          )}
        </InfoNote>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
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

        <Card>
          <CardHeader>
            <CardTitle>Собівартість ремонту</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="text-3xl font-semibold leading-9 tabular-nums">{formatMoney(costKop)}</p>
              <p className="text-xs text-muted-foreground">
                {allocations.length} активних вкладень · {history.length} операцій усього
              </p>
            </div>
            <HorizontalBars
              data={byCategory.map((slice) => ({ name: slice.name, value: Math.round(slice.kop / 100) }))}
              emptyText="Вкладень ще немає."
            />
            <InfoNote>
              Сума рахується за цінами на момент операцій. Нові партії за іншою ціною її не змінюють.
            </InfoNote>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-0">
          <Tabs
            value={tab}
            onValueChange={setTab}
            className="border-0"
            items={[
              { value: 'allocations', label: 'Вкладення', badge: <Badge variant="outline">{allocations.length}</Badge> },
              { value: 'history', label: 'Історія', badge: <Badge variant="outline">{history.length}</Badge> },
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
          {tab === 'allocations' ? (
            allocations.length === 0 ? (
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
              <div className="flex flex-col gap-2">
                {allocations.map((allocation) => {
                  const product = db.products.find((item) => item.id === allocation.productId)
                  return (
                    <div key={allocation.id} className="flex flex-col gap-1 rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{product ? product.name : '—'}</span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatMoney(allocation.totalKop)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatQty(allocation.qty, product?.unit)} · {formatDate(allocation.createdAt)}
                      </p>
                      {canEdit ? (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReleaseFor({ allocation, mode: 'returned' })}
                          >
                            <Undo2 />
                            На склад
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setTransferFor(allocation)}>
                            <ArrowRightLeft />
                            Перенести
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <TableWrap>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Назва</TableHead>
                      <TableHead>Категорія</TableHead>
                      <TableHead className="text-right">К-сть</TableHead>
                      <TableHead className="text-right">Ціна за од.</TableHead>
                      <TableHead className="text-right">Сума</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead>Хто виконав</TableHead>
                      <TableHead>Джерело закупівлі</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map((allocation) => {
                      const product = db.products.find((item) => item.id === allocation.productId)
                      const category = db.categories.find((item) => item.id === product?.categoryId)
                      const user = db.users.find((item) => item.id === allocation.createdById)
                      const prices = allocation.lines.map((line) => line.unitPriceKop)
                      const minPrice = Math.min(...prices)
                      const maxPrice = Math.max(...prices)
                      const sourcePurchaseIds = Array.from(
                        new Set(
                          allocation.lines
                            .map((line) => db.batches.find((item) => item.id === line.batchId)?.purchaseId)
                            .filter((value) => Boolean(value)),
                        ),
                      )

                      return (
                        <TableRow key={allocation.id}>
                          <TableCell className="max-w-56 truncate font-medium">
                            {product ? product.name : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{category ? category.name : '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatQty(allocation.qty, product?.unit)}
                          </TableCell>
                          <TableCell
                            className="text-right tabular-nums"
                            title={
                              allocation.lines.length > 1
                                ? allocation.lines
                                    .map(
                                      (line) =>
                                        `${formatQty(line.qty, product?.unit)} × ${formatMoney(line.unitPriceKop)}`,
                                    )
                                    .join('; ')
                                : undefined
                            }
                          >
                            {minPrice === maxPrice ? (
                              formatMoney(minPrice)
                            ) : (
                              <span className="underline decoration-dotted">
                                від {formatMoney(minPrice)} до {formatMoney(maxPrice)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatMoney(allocation.totalKop)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(allocation.createdAt)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user ? user.fullName : '—'}</TableCell>
                          <TableCell>
                            {sourcePurchaseIds.length === 0 ? (
                              <span className="text-xs text-muted-foreground">коригування</span>
                            ) : (
                              sourcePurchaseIds.map((purchaseId) => {
                                const purchase = db.purchases.find((item) => item.id === purchaseId)
                                if (!purchase) return null
                                return (
                                  <Link
                                    key={purchaseId}
                                    to={`/purchases/${purchaseId}`}
                                    className="mr-1 text-xs hover:underline"
                                  >
                                    {purchase.number}
                                  </Link>
                                )
                              })
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu
                              trigger={
                                <Button variant="ghost" size="icon-sm" aria-label="Дії" disabled={!canEdit}>
                                  <MoreHorizontal />
                                </Button>
                              }
                            >
                              {(close) => (
                                <>
                                  <DropdownItem
                                    icon={<ArrowRightLeft />}
                                    onSelect={() => {
                                      setTransferFor(allocation)
                                      close()
                                    }}
                                  >
                                    Перенести на іншу заявку
                                  </DropdownItem>
                                  <DropdownItem
                                    icon={<Undo2 />}
                                    onSelect={() => {
                                      setReleaseFor({ allocation, mode: 'returned' })
                                      close()
                                    }}
                                  >
                                    Повернути на склад
                                  </DropdownItem>
                                  <DropdownItem
                                    icon={<Trash2 />}
                                    tone="destructive"
                                    onSelect={() => {
                                      setReleaseFor({ allocation, mode: 'cancelled' })
                                      close()
                                    }}
                                  >
                                    Скасувати вкладення
                                  </DropdownItem>
                                </>
                              )}
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableWrap>
            )
          ) : (
            <TableWrap>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Товар</TableHead>
                    <TableHead className="text-right">К-сть</TableHead>
                    <TableHead className="text-right">Сума</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Хто</TableHead>
                    <TableHead>Причина</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableEmpty colSpan={7}>Операцій по заявці ще не було</TableEmpty>
                  ) : (
                    history.map((allocation) => {
                      const product = db.products.find((item) => item.id === allocation.productId)
                      const user = db.users.find((item) => item.id === allocation.createdById)
                      return (
                        <TableRow key={allocation.id}>
                          <TableCell className="text-muted-foreground">
                            {formatDateTime(allocation.createdAt)}
                          </TableCell>
                          <TableCell>{product ? product.name : '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatQty(allocation.qty, product?.unit)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(allocation.totalKop)}
                          </TableCell>
                          <TableCell>
                            <AllocationStatusBadge status={allocation.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user ? user.fullName : '—'}</TableCell>
                          <TableCell className="max-w-56 truncate text-xs text-muted-foreground">
                            {allocation.reason ?? '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TableWrap>
          )}
        </CardContent>
      </Card>

      <AddAllocationDialog open={addOpen} onClose={() => setAddOpen(false)} order={order} />

      <TransferDialog
        open={Boolean(transferFor)}
        onClose={() => setTransferFor(null)}
        allocation={transferFor}
        order={order}
      />

      <ConfirmDialog
        open={Boolean(releaseFor)}
        title={releaseFor?.mode === 'returned' ? 'Повернути на склад?' : 'Скасувати вкладення?'}
        description={
          releaseFor
            ? db.products.find((item) => item.id === releaseFor.allocation.productId)?.name
            : undefined
        }
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
