/**
 * Step 1 of "Add allocation": search the warehouse.
 *
 * Without a query it shows what is in stock; with a query it also shows
 * products that are out of stock (offering to buy them), and when nothing
 * matches it offers to create a new product together with a purchase.
 * The price is never typed here: allocations are priced by FIFO.
 */

import { PackagePlus, PackageX, Plus, Search } from 'lucide-react'
import { useStock } from '@/api'
import type { OrderRow, StockRow } from '@/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { InfoNote } from '@/components/common/page'
import { PhotoTile } from '@/components/common/stat'
import { formatMoney, formatQty } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ClosedOrderNote } from './closed-order-note'

export function SearchStep({
  order,
  query,
  onQueryChange,
  onPick,
  onBuyExisting,
  onBuyNew,
  onClose,
}: {
  order: OrderRow
  query: string
  onQueryChange: (value: string) => void
  onPick: (row: StockRow) => void
  onBuyExisting: (row: StockRow) => void
  onBuyNew: () => void
  onClose: () => void
}) {
  const { data: stock = [] } = useStock()

  const needle = query.trim().toLowerCase()
  const active = stock.filter((row) => row.product.active)
  // No query: the first products in stock. A query: any product by name, in stock or not.
  const matches = needle
    ? active.filter((row) => row.product.name.toLowerCase().includes(needle)).slice(0, 12)
    : active.filter((row) => row.qty > 0).slice(0, 8)

  return (
    <Dialog
      open
      onClose={onClose}
      title="Додати вкладення"
      description={`Заявка № ${order.order.number}`}
      width="md"
      footer={
        <Button variant="outline" onClick={onClose}>
          Закрити
        </Button>
      }
    >
      <ClosedOrderNote locked={order.locked} />
      <div className="flex flex-col gap-4">
        <Field label="Пошук по складу" hint="Почніть вводити назву запчастини або матеріалу">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Наприклад: Карбюратор Honda"
              className="pl-9"
            />
          </div>
        </Field>

        {matches.length > 0 ? (
          <div className="flex flex-col gap-1">
            {matches.map((row) => {
              const available = row.qty > 0
              return (
                <div
                  key={row.product.id}
                  className={cn(
                    'flex items-center gap-3 rounded-md border border-border p-2',
                    available ? 'hover:bg-muted' : 'opacity-80',
                  )}
                >
                  <PhotoTile tone={row.product.photoTone} name={row.product.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {available ? (
                        <>
                          Залишок {formatQty(row.qty, row.product.unit)} · середня {formatMoney(row.avgPriceKop)}
                        </>
                      ) : (
                        <span className="flex items-center gap-1">
                          <PackageX className="size-3" />
                          Немає в наявності
                        </span>
                      )}
                    </p>
                  </div>
                  {available ? (
                    <Button size="sm" onClick={() => onPick(row)}>
                      Вибрати
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => onBuyExisting(row)}>
                      <PackagePlus />
                      Оформити закупівлю
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        ) : null}

        {needle && matches.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-border p-4">
            <p className="text-sm">Нічого не знайдено. Створити новий продукт на складі і оформити закупівлю?</p>
            <Button onClick={onBuyNew}>
              <Plus />
              Створити «{query.trim()}»
            </Button>
          </div>
        ) : null}

        {!needle ? (
          <InfoNote>
            Показані позиції, що є в наявності. Ціна при вкладенні рахується автоматично за FIFO — вручну її вводити не
            потрібно.
          </InfoNote>
        ) : null}
      </div>
    </Dialog>
  )
}
