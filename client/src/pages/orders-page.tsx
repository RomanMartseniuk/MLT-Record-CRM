/**
 * Orders list (repairs from RO App).
 *
 * Statuses are read-only: they come from RO App. The cost of each order and
 * its display names come from the server; the page filters, sorts and pages
 * the rows. The search text lives in the URL (`?q=`), so the header search
 * box and this page share it and a search link can be shared.
 */

import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2, RefreshCw, Search } from 'lucide-react'
import { useOrders, useReference, useSession, useSync } from '@/api'
import type { OrderStatusCode } from '@/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TableSkeleton } from '@/components/ui/skeleton'
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
import { PageBody, PageHeader } from '@/components/common/page'
import { OrderStatusBadge } from '@/components/common/status'
import { formatDate, formatDateTime, formatMoney } from '@/lib/format'
import { ORDER_STATUS_LABELS } from '@/lib/labels'
import { useSingleFlight } from '@/lib/use-single-flight'
import { sortBy } from '@/lib/utils'
import { useUi } from '@/store/ui-context'

const PAGE_SIZE = 10
const STATUS_ORDER: OrderStatusCode[] = ['inQueue', 'inWork', 'done', 'closed']

type SortKey = 'recent' | 'number' | 'cost'

export function OrdersPage() {
  const { data: orders, isLoading } = useOrders()
  const { data: reference } = useReference()
  const sync = useSync()
  const { can } = useSession()
  const { isMobile, toast } = useUi()
  const { run, pending: syncing } = useSingleFlight()
  const [searchParams, setSearchParams] = useSearchParams()

  // The search text is the `q` URL parameter.
  const query = searchParams.get('q') ?? ''
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState<SortKey>('recent')
  const [page, setPage] = useState(0)

  const needle = query.trim().toLowerCase()
  const filtered = (orders ?? []).filter((row) => {
    if (status !== 'all' && row.statusCode !== status) return false
    if (type !== 'all' && row.order.typeId !== type) return false
    if (!needle) return true
    return (
      row.order.number.toLowerCase().includes(needle) ||
      row.assetTitle.toLowerCase().includes(needle) ||
      row.assetModel.toLowerCase().includes(needle) ||
      row.clientName.toLowerCase().includes(needle)
    )
  })

  const rows =
    sort === 'number'
      ? sortBy(filtered, (row) => row.order.number)
      : sort === 'cost'
        ? sortBy(filtered, (row) => -row.costKop)
        : sortBy(filtered, (row) => row.order.createdAt).reverse()

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  /** Asks the server to refresh orders from RO App (read-only on our side). */
  const runSync = () =>
    run(async () => {
      const result = await sync.mutateAsync('manual')
      if (!result.ok) {
        toast(result.error, { tone: 'error' })
        return
      }
      toast('Дані оновлено з RO App', {
        description: `Оновлено ${result.value.updated} заявок. Дублікатів не створено.`,
        tone: 'success',
      })
    })

  const onSearch = (value: string) => {
    setPage(0)
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set('q', value)
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }

  return (
    <PageBody>
      <PageHeader
        title="Заявки"
        description="Ремонти з RO App. Статуси тільки читаються, собівартість рахує MLT Облік."
        actions={
          can('settings.manage') ? (
            <Button variant="outline" size="sm" onClick={() => void runSync()} disabled={syncing}>
              {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Оновити з RO App
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="№ заявки, модель, техніка, клієнт"
            className="pl-9"
          />
        </div>
        <Select
          className="w-full sm:w-40"
          aria-label="Статус"
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setPage(0)
          }}
          options={[
            { value: 'all', label: 'Усі статуси' },
            ...STATUS_ORDER.map((code) => ({ value: code, label: ORDER_STATUS_LABELS[code] })),
          ]}
        />
        <Select
          className="w-full sm:w-40"
          aria-label="Тип"
          value={type}
          onValueChange={(value) => {
            setType(value)
            setPage(0)
          }}
          options={[
            { value: 'all', label: 'Усі типи' },
            ...(reference?.orderTypes ?? []).map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <Select
          className="w-full sm:w-44"
          aria-label="Сортування"
          value={sort}
          onValueChange={(value) => setSort(value as SortKey)}
          options={[
            { value: 'recent', label: 'Спочатку нові' },
            { value: 'number', label: 'За номером' },
            { value: 'cost', label: 'За собівартістю' },
          ]}
        />
      </div>

      {isLoading ? (
        <Card>
          <TableSkeleton rows={8} cols={7} />
        </Card>
      ) : isMobile ? (
        <div className="flex flex-col gap-2">
          {pageRows.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">Заявок не знайдено</Card>
          ) : (
            pageRows.map((row) => (
              <Link key={row.order.id} to={`/orders/${row.order.id}`}>
                <Card className="flex flex-col gap-2 p-3 hover:bg-muted">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold">№ {row.order.number}</span>
                    <OrderStatusBadge rawStatus={row.order.rawStatus} />
                  </div>
                  <p className="text-sm">{row.assetTitle}</p>
                  <p className="text-xs text-muted-foreground">{row.clientName}</p>
                  <div className="flex items-baseline justify-between gap-2 border-t border-border pt-2">
                    <span className="text-xs text-muted-foreground">
                      {row.allocationsCount} вкл. · {formatDate(row.order.createdAt)}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{formatMoney(row.costKop)}</span>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      ) : (
        <Card>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№ заявки</TableHead>
                  <TableHead>Техніка</TableHead>
                  <TableHead>Модель</TableHead>
                  <TableHead>Клієнт</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Створено</TableHead>
                  <TableHead className="text-right">Вкладень</TableHead>
                  <TableHead className="text-right">Собівартість</TableHead>
                  <TableHead>Остання операція</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableEmpty colSpan={10}>Заявок за цими умовами не знайдено</TableEmpty>
                ) : (
                  pageRows.map((row) => (
                    <TableRow key={row.order.id}>
                      <TableCell>
                        <Link to={`/orders/${row.order.id}`} className="font-medium hover:underline">
                          № {row.order.number}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-48 truncate">{row.assetTitle}</TableCell>
                      <TableCell className="text-muted-foreground">{row.assetModel}</TableCell>
                      <TableCell className="max-w-44 truncate">{row.clientName}</TableCell>
                      <TableCell className="text-muted-foreground">{row.typeName}</TableCell>
                      <TableCell>
                        <OrderStatusBadge rawStatus={row.order.rawStatus} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(row.order.createdAt)}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.allocationsCount}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatMoney(row.costKop)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.lastOperationAt ? formatDateTime(row.lastOperationAt) : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableWrap>
        </Card>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Показано {pageRows.length} з {rows.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
          >
            Назад
          </Button>
          <span className="text-xs text-muted-foreground">
            {safePage + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((value) => value + 1)}
          >
            Далі
          </Button>
        </div>
      </div>
    </PageBody>
  )
}
