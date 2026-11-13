import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ExternalLink, PackagePlus, Plus, Search, Send, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/toggle'
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
import { ErrorNote, InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { AllocateProductDialog } from '@/components/allocation/allocate-product-dialog'
import { PhotoTile } from '@/components/common/stat'
import { StockBadge } from '@/components/common/status'
import { productStock, totalStockValueKop } from '@/domain/calc'
import { adjustStock, createProduct, updateProduct } from '@/domain/ops'
import { formatDate, formatMoney, formatQty, parseQty } from '@/lib/format'
import { sortBy, uid } from '@/lib/utils'
import { useDb } from '@/store/db-store'
import { useUi } from '@/store/ui-store'
import type { Product, Unit } from '@/domain/types'

const UNITS: Unit[] = ['шт', 'л', 'кг', 'м']

function ProductDrawer({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { db, apply, currentUser, has } = useDb()
  const { toast } = useUi()
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [error, setError] = useState('')

  if (!product) return null

  const stock = productStock(db, product.id)
  const category = db.categories.find((item) => item.id === product.categoryId)
  const allBatches = sortBy(
    db.batches.filter((batch) => batch.productId === product.id),
    (batch) => batch.receivedAt,
  ).reverse()
  const usage = sortBy(
    db.allocations.filter((allocation) => allocation.productId === product.id),
    (allocation) => allocation.createdAt,
  ).reverse()

  const addLink = () => {
    if (!currentUser) return
    if (!linkLabel.trim() || !linkUrl.trim()) {
      setError('Заповніть підпис і адресу посилання.')
      return
    }
    const links = [...product.links, { id: uid('lnk'), label: linkLabel.trim(), url: linkUrl.trim() }]
    const result = apply((draft) => updateProduct(draft, product.id, { links }, currentUser.id))
    if (!result.ok) {
      setError(result.error)
      return
    }
    setLinkLabel('')
    setLinkUrl('')
    setError('')
    toast('Посилання додано', { tone: 'success' })
  }

  const removeLink = (linkId: string) => {
    if (!currentUser) return
    const links = product.links.filter((link) => link.id !== linkId)
    apply((draft) => updateProduct(draft, product.id, { links }, currentUser.id))
  }

  return (
    <Dialog
      open={Boolean(product)}
      onClose={onClose}
      title={product.name}
      description={`${category ? category.name : 'Без категорії'} · ${product.unit}`}
      width="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Закрити
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <PhotoTile tone={product.photoTone} name={product.name} size="lg" />
          <div className="grid flex-1 gap-2 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Залишок</p>
              <p className="text-lg font-semibold tabular-nums">{formatQty(stock.qty, product.unit)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Середня ціна</p>
              <p className="text-lg font-semibold tabular-nums">{formatMoney(stock.avgPriceKop)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Вартість залишку</p>
              <p className="text-lg font-semibold tabular-nums">{formatMoney(stock.valueKop)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Посилання на магазини</p>
          {product.links.length === 0 ? (
            <p className="text-xs text-muted-foreground">Посилань ще немає.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {product.links.map((link) => (
                <div key={link.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex min-w-0 flex-1 items-center gap-2 text-sm hover:underline"
                  >
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="shrink-0">{link.label}</span>
                    <span className="truncate text-xs text-muted-foreground">{link.url}</span>
                  </a>
                  {has('inventory.manage') ? (
                    <Button variant="ghost" size="sm" onClick={() => removeLink(link.id)}>
                      Прибрати
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {has('inventory.manage') ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Field label="Підпис" className="sm:w-40">
                <Input value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="Rozetka" />
              </Field>
              <Field label="Адреса" className="min-w-0 flex-1">
                <Input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://" />
              </Field>
              <Button variant="outline" onClick={addLink}>
                <Plus />
                Додати
              </Button>
            </div>
          ) : null}
          <ErrorNote>{error}</ErrorNote>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Партії та ціни</p>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Надійшла</TableHead>
                  <TableHead>Закупівля</TableHead>
                  <TableHead className="text-right">Прийшло</TableHead>
                  <TableHead className="text-right">Залишок</TableHead>
                  <TableHead className="text-right">Ціна за од.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allBatches.length === 0 ? (
                  <TableEmpty colSpan={5}>Партій ще не було</TableEmpty>
                ) : (
                  allBatches.map((batch) => {
                    const purchase = db.purchases.find((item) => item.id === batch.purchaseId)
                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="text-muted-foreground">{formatDate(batch.receivedAt)}</TableCell>
                        <TableCell>
                          {purchase ? (
                            <Link to={`/purchases/${purchase.id}`} className="hover:underline">
                              {purchase.number}
                            </Link>
                          ) : (
                            <Badge variant="outline">коригування</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(batch.qtyReceived, product.unit)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(batch.qtyRemaining, product.unit)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(batch.unitPriceKop)}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableWrap>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Використання по заявках</p>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Заявка</TableHead>
                  <TableHead className="text-right">К-сть</TableHead>
                  <TableHead className="text-right">Сума</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.length === 0 ? (
                  <TableEmpty colSpan={5}>Товар ще не використовувався</TableEmpty>
                ) : (
                  usage.map((allocation) => {
                    const order = db.orders.find((item) => item.id === allocation.orderId)
                    return (
                      <TableRow key={allocation.id}>
                        <TableCell className="text-muted-foreground">{formatDate(allocation.createdAt)}</TableCell>
                        <TableCell>
                          {order ? (
                            <Link to={`/orders/${order.id}`} className="hover:underline">
                              № {order.number}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(allocation.qty, product.unit)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(allocation.totalKop)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {allocation.status === 'active' ? 'активне' : 'повернуто або скасовано'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableWrap>
        </div>
      </div>
    </Dialog>
  )
}

export function InventoryPage() {
  const { db, apply, currentUser, has } = useDb()
  const { isMobile, toast } = useUi()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [onlyInStock, setOnlyInStock] = useState(isMobile)
  const [openProduct, setOpenProduct] = useState<Product | null>(null)
  const [allocateFor, setAllocateFor] = useState<Product | null>(null)

  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategoryId, setNewCategoryId] = useState('')
  const [newUnit, setNewUnit] = useState<Unit>('шт')
  const [newError, setNewError] = useState('')

  const [adjustFor, setAdjustFor] = useState<Product | null>(null)
  const [adjustDirection, setAdjustDirection] = useState<'in' | 'out'>('in')
  const [adjustQty, setAdjustQty] = useState('1')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustError, setAdjustError] = useState('')

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const prepared = db.products
      .filter((product) => product.active)
      .map((product) => ({
        product,
        stock: productStock(db, product.id),
        category: db.categories.find((item) => item.id === product.categoryId),
      }))

    const filtered = prepared.filter((row) => {
      if (categoryId !== 'all' && row.product.categoryId !== categoryId) return false
      if (onlyInStock && row.stock.qty <= 0) return false
      if (!needle) return true
      return row.product.name.toLowerCase().includes(needle)
    })

    return sortBy(filtered, (row) => row.product.name)
  }, [db, query, categoryId, onlyInStock])

  const stockValue = useMemo(() => totalStockValueKop(db), [db])
  const inStockCount = useMemo(() => db.products.filter((p) => productStock(db, p.id).qty > 0).length, [db])

  const submitNewProduct = () => {
    if (!currentUser) return
    const result = apply((draft) =>
      createProduct(draft, { name: newName, categoryId: newCategoryId, unit: newUnit, links: [] }, currentUser.id),
    )
    if (!result.ok) {
      setNewError(result.error)
      return
    }
    toast('Товар створено', {
      description: 'Тепер оформіть закупівлю, щоб зʼявився залишок.',
      tone: 'success',
    })
    setNewOpen(false)
    setNewName('')
  }

  const submitAdjust = () => {
    if (!currentUser || !adjustFor) return
    const qty = parseQty(adjustQty)
    if (!qty) {
      setAdjustError('Вкажіть кількість, більшу за нуль.')
      return
    }
    const delta = adjustDirection === 'in' ? qty : -qty
    const result = apply((draft) => adjustStock(draft, adjustFor.id, delta, adjustReason, currentUser.id))
    if (!result.ok) {
      setAdjustError(result.error)
      return
    }
    toast('Залишок скоригований', {
      description: 'Причина збережена в журналі операцій.',
      tone: 'success',
    })
    setAdjustFor(null)
    setAdjustQty('1')
    setAdjustReason('')
    setAdjustError('')
  }

  return (
    <PageBody>
      <PageHeader
        title={isMobile ? 'Склад і закупівлі' : 'Склад'}
        description="Залишки, партії та ціни. Товар із нульовим залишком не зникає."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {has('purchases.create') ? (
              <Button size={isMobile ? 'touch' : 'default'} onClick={() => navigate('/purchases/new')}>
                <PackagePlus />
                Нова закупівля
              </Button>
            ) : null}
            <Button
              variant="outline"
              size={isMobile ? 'touch' : 'default'}
              onClick={() => {
                setNewCategoryId(db.categories.find((item) => item.kind === 'product' && item.active)?.id ?? '')
                setNewError('')
                setNewOpen(true)
              }}
            >
              <Plus />
              Новий товар
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Вартість залишків</p>
          <p className="text-xl font-semibold tabular-nums">{formatMoney(stockValue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Позицій у довіднику</p>
          <p className="text-xl font-semibold tabular-nums">{db.products.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Товарів у наявності</p>
          <p className="text-xl font-semibold tabular-nums">{inStockCount}</p>
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
            ...db.categories
              .filter((item) => item.kind === 'product')
              .map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <Switch checked={onlyInStock} onCheckedChange={setOnlyInStock} label="Тільки в наявності" />
      </div>

      {isMobile ? (
        <div className="flex flex-col gap-2">
          {rows.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">Товарів не знайдено</Card>
          ) : (
            rows.map((row) => (
              <Card key={row.product.id} className="flex flex-col gap-2 p-3">
                <button
                  type="button"
                  className="flex items-start gap-3 text-left"
                  onClick={() => setOpenProduct(row.product)}
                >
                  <PhotoTile tone={row.product.photoTone} name={row.product.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{row.product.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {row.category ? row.category.name : 'Без категорії'}
                    </span>
                  </span>
                  <StockBadge qty={row.stock.qty} />
                </button>
                <div className="flex items-baseline justify-between border-t border-border pt-2 text-xs">
                  <span className="text-muted-foreground">
                    Залишок {formatQty(row.stock.qty, row.product.unit)} · {formatMoney(row.stock.avgPriceKop)}
                  </span>
                  <span className="font-semibold tabular-nums">{formatMoney(row.stock.valueKop)}</span>
                </div>
                <div className="flex gap-2">
                  {has('allocations.create') && row.stock.qty > 0 ? (
                    <Button size="touch" className="flex-1" onClick={() => setAllocateFor(row.product)}>
                      <Send />
                      Розподілити
                    </Button>
                  ) : null}
                  {has('purchases.create') ? (
                    <Button
                      variant="outline"
                      size="touch"
                      className="flex-1"
                      onClick={() => navigate(`/purchases/new?product=${row.product.id}`)}
                    >
                      <PackagePlus />
                      Поповнити
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
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
                          onClick={() => setOpenProduct(row.product)}
                          className="flex items-center gap-2 text-left hover:underline"
                        >
                          <PhotoTile tone={row.product.photoTone} name={row.product.name} size="sm" />
                          <span className="max-w-56 truncate font-medium">{row.product.name}</span>
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.category ? row.category.name : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(row.stock.qty, row.product.unit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(row.stock.avgPriceKop)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(row.stock.valueKop)}
                      </TableCell>
                      <TableCell>
                        <StockBadge qty={row.stock.qty} />
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
                          {has('allocations.create') && row.stock.qty > 0 ? (
                            <Button size="sm" onClick={() => setAllocateFor(row.product)}>
                              Розподілити
                            </Button>
                          ) : null}
                          {has('purchases.create') ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/purchases/new?product=${row.product.id}`)}
                            >
                              Поповнити
                            </Button>
                          ) : null}
                          {has('inventory.manage') ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Коригувати залишок"
                              title="Коригувати залишок"
                              onClick={() => {
                                setAdjustFor(row.product)
                                setAdjustDirection('in')
                                setAdjustQty('1')
                                setAdjustReason('')
                                setAdjustError('')
                              }}
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
      )}

      <InfoNote>
        Склад показує і позиції без залишку — вони лишаються в довіднику з позначкою «Немає в наявності» і
        поповнюються новою закупівлею. Відʼємні залишки заборонені.
      </InfoNote>

      <ProductDrawer product={openProduct} onClose={() => setOpenProduct(null)} />
      <AllocateProductDialog product={allocateFor} onClose={() => setAllocateFor(null)} />

      <Dialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="Новий товар"
        width="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={submitNewProduct}>Створити</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Назва">
            <Input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} />
          </Field>
          <Field label="Категорія">
            <Select
              value={newCategoryId}
              onValueChange={setNewCategoryId}
              options={db.categories
                .filter((item) => item.kind === 'product' && item.active)
                .map((item) => ({ value: item.id, label: item.name }))}
            />
          </Field>
          <Field label="Одиниця">
            <Select
              value={newUnit}
              onValueChange={(value) => setNewUnit(value as Unit)}
              options={UNITS.map((unit) => ({ value: unit, label: unit }))}
            />
          </Field>
          <InfoNote>Залишок зʼявиться після закупівлі. Створення товару сам залишок не змінює.</InfoNote>
          <ErrorNote>{newError}</ErrorNote>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(adjustFor)}
        onClose={() => setAdjustFor(null)}
        title="Коригування залишку"
        description={adjustFor ? adjustFor.name : undefined}
        width="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAdjustFor(null)}>
              Скасувати
            </Button>
            <Button onClick={submitAdjust}>Зберегти</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <InfoNote>
            Ручне коригування — виняткова операція. Причина обовʼязкова й збережеться в журналі.
          </InfoNote>
          <Field label="Напрямок">
            <Select
              value={adjustDirection}
              onValueChange={(value) => setAdjustDirection(value as 'in' | 'out')}
              options={[
                { value: 'in', label: 'Додати на склад' },
                { value: 'out', label: 'Списати зі складу' },
              ]}
            />
          </Field>
          <Field label={`Кількість${adjustFor ? ` (${adjustFor.unit})` : ''}`}>
            <Input
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0"
              value={adjustQty}
              onChange={(event) => setAdjustQty(event.target.value)}
            />
          </Field>
          <Field label="Причина">
            <Textarea
              value={adjustReason}
              onChange={(event) => setAdjustReason(event.target.value)}
              placeholder="Наприклад: інвентаризація, знайдено залишок"
            />
          </Field>
          <ErrorNote>{adjustError}</ErrorNote>
        </div>
      </Dialog>
    </PageBody>
  )
}
