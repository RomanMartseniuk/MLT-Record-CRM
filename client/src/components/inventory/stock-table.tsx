/**
 * Desktop view of the warehouse: one table row per product.
 *
 * Purely presentational: it receives rows and callbacks and decides nothing
 * about stock. Which action buttons show depends on the user's permissions.
 */

import { ExternalLink, SlidersHorizontal } from 'lucide-react'
import { useSession } from '@/api'
import type { Product, StockRow } from '@/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { PhotoTile } from '@/components/common/stat'
import { StockBadge } from '@/components/common/status'
import { formatMoney, formatQty } from '@/lib/format'

/** What the user can do with a product row. Shared by the table and the cards. */
export interface StockRowActions {
  onOpen: (product: Product) => void
  onAllocate: (product: Product) => void
  onAdjust: (product: Product) => void
  onReplenish: (product: Product) => void
}

export function StockTable({ rows, actions }: { rows: StockRow[]; actions: StockRowActions }) {
  const { can } = useSession()

  return (
    <Card>
      <TableWrap>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Товар</TableHead>
              <TableHead>Категорія</TableHead>
              <TableHead className="text-right">Залишок</TableHead>
              <TableHead className="text-right">Середня ціна</TableHead>
              <TableHead className="text-right">Вартість</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Посилання</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={8}>Товарів за цими умовами не знайдено</TableEmpty>
            ) : (
              rows.map((row) => (
                <TableRow key={row.product.id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => actions.onOpen(row.product)}
                      className="flex items-center gap-2 text-left hover:underline"
                    >
                      <PhotoTile tone={row.product.photoTone} name={row.product.name} size="sm" />
                      <span className="max-w-56 truncate font-medium">{row.product.name}</span>
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.categoryName}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatQty(row.qty, row.product.unit)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(row.avgPriceKop)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatMoney(row.valueKop)}</TableCell>
                  <TableCell>
                    <StockBadge qty={row.qty} />
                  </TableCell>
                  <TableCell>
                    {row.product.links.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {row.product.links.map((link) => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-xs hover:bg-muted"
                          >
                            <ExternalLink className="size-3" />
                            {link.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {can('allocations.create') && row.qty > 0 ? (
                        <Button size="sm" onClick={() => actions.onAllocate(row.product)}>
                          Розподілити
                        </Button>
                      ) : null}
                      {can('purchases.create') ? (
                        <Button variant="outline" size="sm" onClick={() => actions.onReplenish(row.product)}>
                          Поповнити
                        </Button>
                      ) : null}
                      {can('inventory.manage') ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Коригувати залишок"
                          title="Коригувати залишок"
                          onClick={() => actions.onAdjust(row.product)}
                        >
                          <SlidersHorizontal />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableWrap>
    </Card>
  )
}
