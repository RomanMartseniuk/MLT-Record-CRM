/**
 * Purchases list. Every figure (total, allocated, remaining, status) comes
 * from the server already computed; the page only filters and renders rows.
 * A purchase is never deleted here: it can only be cancelled on its own page.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { usePurchases, useSession, useSuppliers } from '@/api'
import type { PurchaseStatus } from '@/api'
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
import { InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { DestinationBadge, PurchaseStatusBadge } from '@/components/common/status'
import { formatDate, formatMoney } from '@/lib/format'
import { PURCHASE_STATUS_LABELS } from '@/lib/labels'
import { useUi } from '@/store/ui-context'

const STATUSES: PurchaseStatus[] = ['new', 'partial', 'full', 'cancelled']

export function PurchasesPage() {
  const { data: purchases, isLoading } = usePurchases()
  const { data: suppliers = [] } = useSuppliers()
  const { can } = useSession()
  const { isMobile } = useUi()

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [supplierId, setSupplierId] = useState('all')
  const [destination, setDestination] = useState('all')

  // The server returns newest first; here we only narrow the list down.
  const needle = query.trim().toLowerCase()
  const rows = (purchases ?? []).filter((row) => {
    if (status !== 'all' && row.status !== status) return false
    if (supplierId !== 'all' && row.purchase.supplierId !== supplierId) return false
    if (destination !== 'all' && row.purchase.destination !== destination) return false
    if (!needle) return true
    return (
      row.purchase.number.toLowerCase().includes(needle) ||
      row.supplierName.toLowerCase().includes(needle) ||
      (row.purchase.docNumber ?? '').toLowerCase().includes(needle)
    )
  })

  return (
    <PageBody>
      <PageHeader
        title="Закупівлі"
        description="Усі придбані запчастини та матеріали — на склад або напряму в заявку"
        actions={
          can('purchases.create') ? (
            <Link to="/purchases/new">
              <Button size={isMobile ? 'touch' : 'default'}>
                <Plus />
                Нова закупівля
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Номер, постачальник, документ"
            className="pl-9"
          />
        </div>
        <Select
          className="w-full sm:w-48"
          aria-label="Статус"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: 'all', label: 'Усі статуси' },
            ...STATUSES.map((item) => ({ value: item, label: PURCHASE_STATUS_LABELS[item] })),
          ]}
        />
        <Select
          className="w-full sm:w-48"
          aria-label="Постачальник"
          value={supplierId}
          onValueChange={setSupplierId}
          options={[
            { value: 'all', label: 'Усі постачальники' },
            ...suppliers.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <Select
          className="w-full sm:w-40"
          aria-label="Призначення"
          value={destination}
          onValueChange={setDestination}
          options={[
            { value: 'all', label: 'Будь-яке призначення' },
            { value: 'warehouse', label: 'На склад' },
            { value: 'order', label: 'У заявку' },
          ]}
        />
      </div>

      <InfoNote>Закупівлю не можна видалити — її тільки скасовують. Історія лишається в журналі операцій.</InfoNote>

      {isLoading ? (
        <Card>
          <TableSkeleton rows={8} cols={7} />
        </Card>
      ) : isMobile ? (
        <div className="flex flex-col gap-2">
          {rows.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">Закупівель не знайдено</Card>
          ) : (
            rows.map((row) => (
              <Link key={row.purchase.id} to={`/purchases/${row.purchase.id}`}>
                <Card className="flex flex-col gap-2 p-3 hover:bg-muted">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold">{row.purchase.number}</span>
                    <PurchaseStatusBadge status={row.status} />
                  </div>
                  <p className="text-sm">{row.supplierName}</p>
                  <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(row.purchase.date)} · {row.purchase.items.length} поз.
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{formatMoney(row.totalKop)}</span>
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
                  <TableHead>№</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Постачальник</TableHead>
                  <TableHead>Документ</TableHead>
                  <TableHead>Призначення</TableHead>
                  <TableHead className="text-right">Позицій</TableHead>
                  <TableHead className="text-right">Сума</TableHead>
                  <TableHead className="text-right">Розподілено</TableHead>
                  <TableHead className="text-right">Залишок на складі</TableHead>
                  <TableHead>Автор</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableEmpty colSpan={11}>Закупівель за цими умовами не знайдено</TableEmpty>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.purchase.id}>
                      <TableCell>
                        <Link to={`/purchases/${row.purchase.id}`} className="font-medium hover:underline">
                          {row.purchase.number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(row.purchase.date)}</TableCell>
                      <TableCell className="max-w-44 truncate">{row.supplierName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.purchase.docNumber ?? '—'}</TableCell>
                      <TableCell>
                        <DestinationBadge destination={row.purchase.destination} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.purchase.items.length}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatMoney(row.totalKop)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatMoney(row.allocatedKop)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(row.remainingKop)}</TableCell>
                      <TableCell className="max-w-36 truncate text-muted-foreground">{row.createdByName}</TableCell>
                      <TableCell>
                        <PurchaseStatusBadge status={row.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableWrap>
        </Card>
      )}
    </PageBody>
  )
}
