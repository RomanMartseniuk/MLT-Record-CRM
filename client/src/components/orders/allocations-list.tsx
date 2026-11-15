/**
 * The active allocations of an order: a table on desktop, cards on mobile.
 *
 * Purely presentational. What the user may do (return, cancel, move) is
 * decided by the page (`canEdit`) and reported through callbacks; the actual
 * operations are server calls made by the page.
 */

import { Link } from 'react-router-dom'
import { ArrowRightLeft, MoreHorizontal, Trash2, Undo2 } from 'lucide-react'
import type { AllocationRow } from '@/api'
import { Button } from '@/components/ui/button'
import { DropdownItem, DropdownMenu } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '@/components/ui/table'
import { formatDate, formatMoney, formatQty } from '@/lib/format'

/** What can be done with an allocation row. */
export interface AllocationActions {
  onTransfer: (row: AllocationRow) => void
  onRelease: (row: AllocationRow, mode: 'returned' | 'cancelled') => void
}

/** The price cell: one price, or "from … to …" when the write-off spanned several batches. */
function PriceCell({ row }: { row: AllocationRow }) {
  const { lines } = row.allocation
  const prices = lines.map((line) => line.unitPriceKop)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const breakdown =
    lines.length > 1
      ? lines.map((line) => `${formatQty(line.qty, row.unit)} × ${formatMoney(line.unitPriceKop)}`).join('; ')
      : undefined

  return (
    <TableCell className="text-right tabular-nums" title={breakdown}>
      {minPrice === maxPrice ? (
        formatMoney(minPrice)
      ) : (
        <span className="underline decoration-dotted">
          від {formatMoney(minPrice)} до {formatMoney(maxPrice)}
        </span>
      )}
    </TableCell>
  )
}

export function AllocationsTable({
  rows,
  canEdit,
  actions,
}: {
  rows: AllocationRow[]
  canEdit: boolean
  actions: AllocationActions
}) {
  return (
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
          {rows.map((row) => (
            <TableRow key={row.allocation.id}>
              <TableCell className="max-w-56 truncate font-medium">{row.productName}</TableCell>
              <TableCell className="text-muted-foreground">{row.categoryName}</TableCell>
              <TableCell className="text-right tabular-nums">{formatQty(row.allocation.qty, row.unit)}</TableCell>
              <PriceCell row={row} />
              <TableCell className="text-right font-medium tabular-nums">
                {formatMoney(row.allocation.totalKop)}
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(row.allocation.createdAt)}</TableCell>
              <TableCell className="text-muted-foreground">{row.createdByName}</TableCell>
              <TableCell>
                {row.sourcePurchases.length === 0 ? (
                  <span className="text-xs text-muted-foreground">коригування</span>
                ) : (
                  row.sourcePurchases.map((purchase) => (
                    <Link key={purchase.id} to={`/purchases/${purchase.id}`} className="mr-1 text-xs hover:underline">
                      {purchase.number}
                    </Link>
                  ))
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
                          actions.onTransfer(row)
                          close()
                        }}
                      >
                        Перенести на іншу заявку
                      </DropdownItem>
                      <DropdownItem
                        icon={<Undo2 />}
                        onSelect={() => {
                          actions.onRelease(row, 'returned')
                          close()
                        }}
                      >
                        Повернути на склад
                      </DropdownItem>
                      <DropdownItem
                        icon={<Trash2 />}
                        tone="destructive"
                        onSelect={() => {
                          actions.onRelease(row, 'cancelled')
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
          ))}
        </TableBody>
      </Table>
    </TableWrap>
  )
}

export function AllocationsCards({
  rows,
  canEdit,
  actions,
}: {
  rows: AllocationRow[]
  canEdit: boolean
  actions: AllocationActions
}) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.allocation.id} className="flex flex-col gap-1 rounded-md border border-border p-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium">{row.productName}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {formatMoney(row.allocation.totalKop)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatQty(row.allocation.qty, row.unit)} · {formatDate(row.allocation.createdAt)}
          </p>
          {canEdit ? (
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => actions.onRelease(row, 'returned')}>
                <Undo2 />
                На склад
              </Button>
              <Button size="sm" variant="outline" onClick={() => actions.onTransfer(row)}>
                <ArrowRightLeft />
                Перенести
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
