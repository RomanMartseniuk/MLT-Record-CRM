/**
 * Warehouse page: every product with its stock, price and value.
 *
 * The page only composes: the data and every number come from the API
 * (`useStock`, `useStockTotals`), the table/cards render rows, and each
 * dialog lives in its own component. A product with zero stock stays in the
 * list (marked "Немає в наявності") and is replenished by a new purchase.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackagePlus, Plus, Search } from 'lucide-react'
import { useCategories, useSession, useStock, useStockTotals } from '@/api'
import type { Product } from '@/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/toggle'
import { InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { AllocateProductDialog } from '@/components/allocation/allocate-product-dialog'
import { AdjustStockDialog } from '@/components/inventory/adjust-stock-dialog'
import { NewProductDialog } from '@/components/inventory/new-product-dialog'
import { ProductDrawer } from '@/components/inventory/product-drawer'
import { StockCards } from '@/components/inventory/stock-cards'
import { StockTable } from '@/components/inventory/stock-table'
import type { StockRowActions } from '@/components/inventory/stock-table'
import { formatMoney } from '@/lib/format'
import { useUi } from '@/store/ui-context'

export function InventoryPage() {
  const { data: stock, isLoading } = useStock()
  const { data: totals } = useStockTotals()
  const { data: categories = [] } = useCategories()
  const { can } = useSession()
  const { isMobile } = useUi()
  const navigate = useNavigate()

  // Filters are applied to the rows the server returned (the list is small).
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [onlyInStock, setOnlyInStock] = useState(isMobile)

  // Which dialog is open and for which product.
  const [openProduct, setOpenProduct] = useState<Product | null>(null)
  const [allocateFor, setAllocateFor] = useState<Product | null>(null)
  const [adjustFor, setAdjustFor] = useState<Product | null>(null)
  const [newOpen, setNewOpen] = useState(false)

  const needle = query.trim().toLowerCase()
  const rows = (stock ?? []).filter((row) => {
    if (!row.product.active) return false
    if (categoryId !== 'all' && row.product.categoryId !== categoryId) return false
    if (onlyInStock && row.qty <= 0) return false
    return !needle || row.product.name.toLowerCase().includes(needle)
  })

  const actions: StockRowActions = {
    onOpen: setOpenProduct,
    onAllocate: setAllocateFor,
    onAdjust: setAdjustFor,
    onReplenish: (product) => navigate(`/purchases/new?product=${product.id}`),
  }

  return (
    <PageBody>
      <PageHeader
        title={isMobile ? 'Склад і закупівлі' : 'Склад'}
        description="Залишки, партії та ціни. Товар із нульовим залишком не зникає."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {can('purchases.create') ? (
              <Button size={isMobile ? 'touch' : 'default'} onClick={() => navigate('/purchases/new')}>
                <PackagePlus />
                Нова закупівля
              </Button>
            ) : null}
            <Button variant="outline" size={isMobile ? 'touch' : 'default'} onClick={() => setNewOpen(true)}>
              <Plus />
              Новий товар
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Вартість залишків</p>
          {totals ? (
            <p className="text-xl font-semibold tabular-nums">{formatMoney(totals.valueKop)}</p>
          ) : (
            <Skeleton className="mt-1 h-7 w-32" />
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Позицій у довіднику</p>
          {totals ? (
            <p className="text-xl font-semibold tabular-nums">{totals.productsCount}</p>
          ) : (
            <Skeleton className="mt-1 h-7 w-16" />
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Товарів у наявності</p>
          {totals ? (
            <p className="text-xl font-semibold tabular-nums">{totals.productsInStock}</p>
          ) : (
            <Skeleton className="mt-1 h-7 w-16" />
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Назва товару"
            className="pl-9"
          />
        </div>
        <Select
          className="w-full sm:w-52"
          aria-label="Категорія"
          value={categoryId}
          onValueChange={setCategoryId}
          options={[
            { value: 'all', label: 'Усі категорії' },
            ...categories
              .filter((item) => item.kind === 'product')
              .map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <Switch checked={onlyInStock} onCheckedChange={setOnlyInStock} label="Тільки в наявності" />
      </div>

      {isLoading ? (
        <Card>
          <TableSkeleton rows={8} cols={6} />
        </Card>
      ) : isMobile ? (
        <StockCards rows={rows} actions={actions} />
      ) : (
        <StockTable rows={rows} actions={actions} />
      )}

      <InfoNote>
        Склад показує і позиції без залишку — вони лишаються в довіднику з позначкою «Немає в наявності» і
        поповнюються новою закупівлею. Відʼємні залишки заборонені.
      </InfoNote>

      {/* Dialogs are mounted only while open, so each starts with a clean form. */}
      {openProduct ? <ProductDrawer product={openProduct} onClose={() => setOpenProduct(null)} /> : null}
      {allocateFor ? <AllocateProductDialog product={allocateFor} onClose={() => setAllocateFor(null)} /> : null}
      {adjustFor ? <AdjustStockDialog product={adjustFor} onClose={() => setAdjustFor(null)} /> : null}
      {newOpen ? <NewProductDialog onClose={() => setNewOpen(false)} /> : null}
    </PageBody>
  )
}
