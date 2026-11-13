import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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
import { EmptyState, ErrorNote, InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { unallocatedRows } from '@/domain/calc'
import type { UnallocatedRow } from '@/domain/calc'
import { isOrderLocked } from '@/domain/labels'
import { addAllocation } from '@/domain/ops'
import { formatDate, formatMoney, formatQty, parseQty } from '@/lib/format'
import { sortBy, sum } from '@/lib/utils'
import { useDb } from '@/store/db-store'
import { useUi } from '@/store/ui-store'

type SortKey = 'date' | 'amount'

export function UnallocatedPage() {
  const { db, apply, currentUser, has } = useDb()
  const { isMobile, toast } = useUi()

  const [supplierId, setSupplierId] = useState('all')
  const [sort, setSort] = useState<SortKey>('date')
  const [target, setTarget] = useState<UnallocatedRow | null>(null)
  const [orderId, setOrderId] = useState('')
  const [qtyInput, setQtyInput] = useState('1')
  const [error, setError] = useState('')

  const rows = useMemo(() => {
    const all = unallocatedRows(db).filter((row) => supplierId === 'all' || row.purchase.supplierId === supplierId)
    if (sort === 'amount') return sortBy(all, (row) => -row.unallocatedKop)
    return sortBy(all, (row) => row.purchase.date).reverse()
  }, [db, supplierId, sort])

  const totalKop = sum(rows.map((row) => row.unallocatedKop))

  const orderOptions = db.orders
    .filter((order) => !isOrderLocked(db, order.rawStatus))
    .map((order) => ({ value: order.id, label: `№ ${order.number} · ${order.malfunction.slice(0, 40)}` }))

  const openQuick = (row: UnallocatedRow) => {
    setTarget(row)
    setOrderId('')
    setQtyInput(String(row.availableQty))
    setError('')
  }

  const submitQuick = () => {
    if (!target || !currentUser) return
    const qty = parseQty(qtyInput)
    if (!qty) {
      setError('Вкажіть кількість, більшу за нуль.')
      return
    }
    if (!orderId) {
      setError('Виберіть заявку.')
      return
    }
    if (qty > target.availableQty) {
      setError(`Доступно лише ${formatQty(target.availableQty, target.product?.unit)}.`)
      return
    }
    const result = apply((draft) =>
      addAllocation(draft, { orderId, productId: target.item.productId, qty }, currentUser.id),
    )
    if (!result.ok) {
      setError(result.error)
      return
    }
    const order = db.orders.find((item) => item.id === orderId)
    toast('Позицію розподілено', {
      description: `${target.product?.name} → заявка № ${order?.number}. Сума ${formatMoney(result.value.totalKop)}.`,
      tone: 'success',
    })
    setTarget(null)
  }

  return (
    <PageBody>
      <PageHeader
        title="Нерозподілені закупівлі"
        description="Куплено, але ще не привʼязано до конкретного ремонту"
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Select
          className="w-full sm:w-52"
          aria-label="Постачальник"
          value={supplierId}
          onValueChange={setSupplierId}
          options={[
            { value: 'all', label: 'Усі постачальники' },
            ...db.suppliers.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <Select
          className="w-full sm:w-52"
          aria-label="Сортування"
          value={sort}
          onValueChange={(value) => setSort(value as SortKey)}
          options={[
            { value: 'date', label: 'Спочатку нові' },
            { value: 'amount', label: 'За сумою' },
          ]}
        />
        <div className="sm:ml-auto">
          <Card className="px-4 py-2">
            <p className="text-xs text-muted-foreground">Нерозподілено разом</p>
            <p className="text-lg font-semibold tabular-nums">{formatMoney(totalKop)}</p>
          </Card>
        </div>
      </div>

      <InfoNote>
        Мета сторінки — щоб куплені ресурси не випадали з обліку. Ці гроші вже витрачені на закупівлю й лежать на
        складі, тому з вкладеннями в ремонти вони не додаються.
      </InfoNote>

      {rows.length === 0 ? (
        <EmptyState
          title="Усе розподілено"
          description="Немає позицій, які чекають привʼязки до заявки."
        />
      ) : isMobile ? (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <Card key={row.batch.id} className="flex flex-col gap-2 p-3">
              <p className="text-sm font-medium">{row.product ? row.product.name : '—'}</p>
              <p className="text-xs text-muted-foreground">
                {row.supplierName} · {formatDate(row.purchase.date)}
              </p>
              <div className="flex items-baseline justify-between border-t border-border pt-2 text-xs">
                <span className="text-muted-foreground">
                  Доступно {formatQty(row.availableQty, row.product?.unit)}
                </span>
                <span className="font-semibold tabular-nums">{formatMoney(row.unallocatedKop)}</span>
              </div>
              {has('allocations.create') ? (
                <Button size="touch" onClick={() => openQuick(row)}>
                  <Zap />
                  Швидко розподілити
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Позиція</TableHead>
                  <TableHead>Закупівля</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Постачальник</TableHead>
                  <TableHead className="text-right">Усього</TableHead>
                  <TableHead className="text-right">Розподілено</TableHead>
                  <TableHead className="text-right">Доступно</TableHead>
                  <TableHead className="text-right">Сума позиції</TableHead>
                  <TableHead className="text-right">Нерозподілено</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableEmpty colSpan={10}>Нерозподілених позицій немає</TableEmpty>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.batch.id}>
                      <TableCell className="max-w-56 truncate font-medium">
                        {row.product ? row.product.name : '—'}
                      </TableCell>
                      <TableCell>
                        <Link to={`/purchases/${row.purchase.id}`} className="hover:underline">
                          {row.purchase.number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(row.purchase.date)}</TableCell>
                      <TableCell className="max-w-40 truncate">{row.supplierName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(row.totalQty, row.product?.unit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatQty(row.allocatedQty, row.product?.unit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(row.availableQty, row.product?.unit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatMoney(row.totalKop)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(row.unallocatedKop)}
                      </TableCell>
                      <TableCell className="text-right">
                        {has('allocations.create') ? (
                          <Button variant="outline" size="sm" onClick={() => openQuick(row)}>
                            <Zap />
                            Розподілити
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableWrap>
        </Card>
      )}

      <Dialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title="Швидке розподілення"
        description={target?.product?.name}
        width="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Скасувати
            </Button>
            <Button onClick={submitQuick}>Розподілити</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <InfoNote>
            Ціна візьметься автоматично за FIFO. Доступно{' '}
            {target ? formatQty(target.availableQty, target.product?.unit) : '—'}.
          </InfoNote>
          <Field label="Заявка">
            <Select value={orderId} onValueChange={setOrderId} options={orderOptions} placeholder="Виберіть заявку" />
          </Field>
          <Field label={`Кількість${target?.product ? ` (${target.product.unit})` : ''}`}>
            <Input
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0"
              value={qtyInput}
              onChange={(event) => setQtyInput(event.target.value)}
            />
          </Field>
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Dialog>
    </PageBody>
  )
}
