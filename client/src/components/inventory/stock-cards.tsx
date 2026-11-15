/**
 * Mobile view of the warehouse: one card per product (touch-sized buttons).
 * Presentational like `StockTable`; they share the same row actions.
 */

import { PackagePlus, Send } from 'lucide-react'
import { useSession } from '@/api'
import type { StockRow } from '@/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PhotoTile } from '@/components/common/stat'
import { StockBadge } from '@/components/common/status'
import { formatMoney, formatQty } from '@/lib/format'
import type { StockRowActions } from './stock-table'

export function StockCards({ rows, actions }: { rows: StockRow[]; actions: StockRowActions }) {
  const { can } = useSession()

  if (rows.length === 0) {
    return <Card className="p-6 text-center text-sm text-muted-foreground">Товарів не знайдено</Card>
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <Card key={row.product.id} className="flex flex-col gap-2 p-3">
          <button
            type="button"
            className="flex items-start gap-3 text-left"
            onClick={() => actions.onOpen(row.product)}
          >
            <PhotoTile tone={row.product.photoTone} name={row.product.name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{row.product.name}</span>
              <span className="block text-xs text-muted-foreground">{row.categoryName}</span>
            </span>
            <StockBadge qty={row.qty} />
          </button>
          <div className="flex items-baseline justify-between border-t border-border pt-2 text-xs">
            <span className="text-muted-foreground">
              Залишок {formatQty(row.qty, row.product.unit)} · {formatMoney(row.avgPriceKop)}
            </span>
            <span className="font-semibold tabular-nums">{formatMoney(row.valueKop)}</span>
          </div>
          <div className="flex gap-2">
            {can('allocations.create') && row.qty > 0 ? (
              <Button size="touch" className="flex-1" onClick={() => actions.onAllocate(row.product)}>
                <Send />
                Розподілити
              </Button>
            ) : null}
            {can('purchases.create') ? (
              <Button
                variant="outline"
                size="touch"
                className="flex-1"
                onClick={() => actions.onReplenish(row.product)}
              >
                <PackagePlus />
                Поповнити
              </Button>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  )
}
