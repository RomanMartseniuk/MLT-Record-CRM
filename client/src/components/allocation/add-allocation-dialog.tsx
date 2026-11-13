import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, PackagePlus, PackageX, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/toggle'
import { ErrorNote, InfoNote } from '@/components/common/page'
import { PhotoTile } from '@/components/common/stat'
import { fifoBatches, planFifo, productStock, roundQty } from '@/domain/calc'
import { isOrderLocked } from '@/domain/labels'
import { addAllocation, createProduct, createPurchase } from '@/domain/ops'
import { formatDate, formatMoney, formatQty, kopToInput, parseMoneyToKop, parseQty } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useDb } from '@/store/db-store'
import { useUi } from '@/store/ui-store'
import type { Order, Unit } from '@/domain/types'

const UNITS: Unit[] = ['шт', 'л', 'кг', 'м']

type Mode = 'search' | 'allocate' | 'buy'

export function AddAllocationDialog({
  open,
  onClose,
  order,
}: {
  open: boolean
  onClose: () => void
  order: Order
}) {
  const { db, apply, currentUser } = useDb()
  const { toast } = useUi()

  const [mode, setMode] = useState<Mode>('search')
  const [query, setQuery] = useState('')
  const [productId, setProductId] = useState('')
  const [qtyInput, setQtyInput] = useState('1')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  // Форма закупівлі: або для нового товару, або для наявного без залишку.
  const [buyProductId, setBuyProductId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newCategoryId, setNewCategoryId] = useState('')
  const [newUnit, setNewUnit] = useState<Unit>('шт')
  const [supplierId, setSupplierId] = useState('')
  const [buyQty, setBuyQty] = useState('1')
  const [buyPrice, setBuyPrice] = useState('')
  const [hasReceipt, setHasReceipt] = useState(false)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [toOrder, setToOrder] = useState(true)

  const locked = isOrderLocked(db, order.rawStatus)

  useEffect(() => {
    if (!open) return
    setMode('search')
    setQuery('')
    setProductId('')
    setQtyInput('1')
    setReason('')
    setError('')
    setBuyProductId(null)
    setNewName('')
    setNewCategoryId(db.categories.find((item) => item.kind === 'product' && item.active)?.id ?? '')
    setNewUnit('шт')
    setSupplierId(db.suppliers.find((item) => item.active)?.id ?? '')
    setBuyQty('1')
    setBuyPrice('')
    setHasReceipt(false)
    setLinkLabel('')
    setLinkUrl('')
    setToOrder(true)
  }, [open, db.categories, db.suppliers])

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const rows = db.products
      .filter((product) => product.active)
      .map((product) => ({ product, stock: productStock(db, product.id) }))
    if (!needle) {
      return rows.filter((row) => row.stock.qty > 0).slice(0, 8)
    }
    return rows.filter((row) => row.product.name.toLowerCase().includes(needle)).slice(0, 12)
  }, [db, query])

  const selected = db.products.find((item) => item.id === productId)
  const stock = productId ? productStock(db, productId) : null
  const qty = parseQty(qtyInput)
  const plan = useMemo(() => {
    if (!productId || !qty) return null
    return planFifo(fifoBatches(db, productId), qty)
  }, [db, productId, qty])

  const categoryOptions = db.categories
    .filter((item) => item.kind === 'product' && item.active)
    .map((item) => ({ value: item.id, label: item.name }))

  const supplierOptions = db.suppliers
    .filter((item) => item.active)
    .map((item) => ({ value: item.id, label: item.name }))

  const buyProduct = buyProductId ? db.products.find((item) => item.id === buyProductId) : null

  const openBuyForNew = () => {
    setBuyProductId(null)
    setNewName(query.trim())
    setBuyPrice('')
    setBuyQty('1')
    setToOrder(true)
    setError('')
    setMode('buy')
  }

  const openBuyForExisting = (id: string) => {
    const product = db.products.find((item) => item.id === id)
    const info = productStock(db, id)
    setBuyProductId(id)
    setNewUnit(product ? product.unit : 'шт')
    setBuyPrice(info.avgPriceKop > 0 ? kopToInput(info.avgPriceKop) : '')
    setBuyQty('1')
    setToOrder(true)
    setError('')
    setMode('buy')
  }

  const pickProduct = (id: string) => {
    setProductId(id)
    setQtyInput('1')
    setError('')
    setMode('allocate')
  }

  const submitAllocation = () => {
    if (!currentUser) return
    if (!qty) {
      setError('Вкажіть кількість, більшу за нуль.')
      return
    }
    const result = apply((draft) =>
      addAllocation(draft, { orderId: order.id, productId, qty, reason: reason.trim() || undefined }, currentUser.id),
    )
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast('Вкладення додано', {
      description: `${selected?.name}: ${formatQty(qty, selected?.unit)} на суму ${formatMoney(result.value.totalKop)}. Залишок на складі зменшено.`,
      tone: 'success',
    })
    onClose()
  }

  const submitBuy = () => {
    if (!currentUser) return
    const purchaseQty = parseQty(buyQty)
    const priceKop = parseMoneyToKop(buyPrice)

    if (!purchaseQty) {
      setError('Вкажіть кількість закупівлі, більшу за нуль.')
      return
    }
    if (!priceKop || priceKop <= 0) {
      setError('Вкажіть ціну за одиницю.')
      return
    }
    if (!supplierId) {
      setError('Виберіть постачальника.')
      return
    }
    if (!buyProductId && !newName.trim()) {
      setError('Вкажіть назву нового товару.')
      return
    }
    if (!buyProductId && !newCategoryId) {
      setError('Виберіть категорію для нового товару.')
      return
    }

    const result = apply((draft) => {
      let targetProductId = buyProductId
      if (!targetProductId) {
        const created = createProduct(
          draft,
          {
            name: newName,
            categoryId: newCategoryId,
            unit: newUnit,
            links:
              linkUrl.trim() && linkLabel.trim()
                ? [{ id: `lnk_${Date.now()}`, label: linkLabel.trim(), url: linkUrl.trim() }]
                : [],
          },
          currentUser.id,
        )
        if (!created.ok) return created
        targetProductId = created.value.id
      }

      return createPurchase(
        draft,
        {
          supplierId,
          hasReceipt,
          destination: toOrder ? 'order' : 'warehouse',
          orderId: toOrder ? order.id : undefined,
          comment: toOrder ? `Закупівля під заявку № ${order.number}` : undefined,
          items: [{ productId: targetProductId, qty: purchaseQty, unitPriceKop: priceKop }],
        },
        currentUser.id,
      )
    })

    if (!result.ok) {
      setError(result.error)
      return
    }

    const name = buyProduct ? buyProduct.name : newName.trim()
    if (toOrder) {
      toast('Закупівлю оформлено і додано у заявку', {
        description: `${name}: ${formatQty(purchaseQty, newUnit)} × ${formatMoney(priceKop)}. На склад позиція не потрапляє.`,
        tone: 'success',
      })
    } else {
      toast('Закупівлю оформлено на склад', {
        description: `${name}: ${formatQty(purchaseQty, newUnit)}. Тепер позицію можна розподілити у заявку.`,
        tone: 'success',
      })
    }
    onClose()
  }

  const title =
    mode === 'buy'
      ? buyProduct
        ? `Закупівля: ${buyProduct.name}`
        : 'Новий продукт і закупівля'
      : mode === 'allocate'
        ? 'Кількість і ціна'
        : 'Додати вкладення'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={`Заявка № ${order.number}`}
      width="md"
      footer={
        mode === 'search' ? (
          <Button variant="outline" onClick={onClose}>
            Закрити
          </Button>
        ) : mode === 'allocate' ? (
          <>
            <Button variant="outline" onClick={() => setMode('search')}>
              <ArrowLeft />
              Назад
            </Button>
            <Button onClick={submitAllocation} disabled={!plan || plan.shortfall > 0}>
              Додати вкладення
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setMode('search')}>
              <ArrowLeft />
              Назад
            </Button>
            <Button onClick={submitBuy}>{toOrder ? 'Оформити і додати' : 'Оформити на склад'}</Button>
          </>
        )
      }
    >
      {locked ? (
        <InfoNote className="mb-4">
          Заявка закрита. Зміна вкладень можлива лише з правом «Зміна вкладень у закритій заявці» і обовʼязковою
          причиною — вона збережеться в журналі.
        </InfoNote>
      ) : null}

      {mode === 'search' ? (
        <div className="flex flex-col gap-4">
          <Field label="Пошук по складу" hint="Почніть вводити назву запчастини або матеріалу">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Наприклад: Карбюратор Honda"
                className="pl-9"
              />
            </div>
          </Field>

          {matches.length > 0 ? (
            <div className="flex flex-col gap-1">
              {matches.map(({ product, stock: info }) => {
                const available = info.qty > 0
                return (
                  <div
                    key={product.id}
                    className={cn(
                      'flex items-center gap-3 rounded-md border border-border p-2',
                      available ? 'hover:bg-muted' : 'opacity-80',
                    )}
                  >
                    <PhotoTile tone={product.photoTone} name={product.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {available ? (
                          <>
                            Залишок {formatQty(info.qty, product.unit)} · середня {formatMoney(info.avgPriceKop)}
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
                      <Button size="sm" onClick={() => pickProduct(product.id)}>
                        Вибрати
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => openBuyForExisting(product.id)}>
                        <PackagePlus />
                        Оформити закупівлю
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : null}

          {query.trim().length > 0 && matches.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-border p-4">
              <p className="text-sm">
                Нічого не знайдено. Створити новий продукт на складі і оформити закупівлю?
              </p>
              <Button onClick={openBuyForNew}>
                <Plus />
                Створити «{query.trim()}»
              </Button>
            </div>
          ) : null}

          {query.trim().length === 0 ? (
            <InfoNote>
              Показані позиції, що є в наявності. Ціна при вкладенні рахується автоматично за FIFO — вручну її
              вводити не потрібно.
            </InfoNote>
          ) : null}
        </div>
      ) : null}

      {mode === 'allocate' && selected && stock ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-md border border-border p-3">
            <PhotoTile tone={selected.photoTone} name={selected.name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{selected.name}</p>
              <p className="text-xs text-muted-foreground">
                Доступно {formatQty(stock.qty, selected.unit)} · {stock.batches.length}{' '}
                {stock.batches.length === 1 ? 'партія' : 'партії'}
              </p>
            </div>
          </div>

          <Field
            label={`Кількість (${selected.unit})`}
            hint={`Максимум ${formatQty(stock.qty, selected.unit)}`}
            error={qty && qty > stock.qty ? 'Більше, ніж є на складі.' : undefined}
          >
            <Input
              autoFocus
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0"
              value={qtyInput}
              onChange={(event) => setQtyInput(event.target.value)}
            />
          </Field>

          {plan && plan.shortfall === 0 && plan.lines.length > 0 ? (
            <div className="flex flex-col gap-2 rounded-md border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">Розрахунок за FIFO</p>
              {plan.lines.map((line) => {
                const batch = db.batches.find((item) => item.id === line.batchId)
                return (
                  <div key={line.batchId} className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">
                      Партія від {batch ? formatDate(batch.receivedAt) : '—'} · {formatMoney(line.unitPriceKop)}/
                      {selected.unit}
                    </span>
                    <span className="tabular-nums">
                      {formatQty(line.qty, selected.unit)} = {formatMoney(Math.round(line.qty * line.unitPriceKop))}
                    </span>
                  </div>
                )
              })}
              <div className="mt-1 flex items-baseline justify-between border-t border-border pt-2 text-sm">
                <span className="font-medium">Разом</span>
                <span className="font-semibold tabular-nums">{formatMoney(plan.totalKop)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Залишок після операції: {formatQty(roundQty(stock.qty - (qty ?? 0)), selected.unit)}
              </p>
            </div>
          ) : null}

          {locked ? (
            <Field label="Причина зміни" hint="Обовʼязково для закритої заявки">
              <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
            </Field>
          ) : null}

          <ErrorNote>{error}</ErrorNote>
        </div>
      ) : null}

      {mode === 'buy' ? (
        <div className="flex flex-col gap-4">
          {buyProduct ? (
            <InfoNote>
              Поповнення складу для «{buyProduct.name}». Нова партія отримає власну ціну, історична собівартість
              попередніх вкладень не зміниться.
            </InfoNote>
          ) : (
            <>
              <Field label="Назва товару">
                <Input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Категорія">
                  <Select value={newCategoryId} onValueChange={setNewCategoryId} options={categoryOptions} />
                </Field>
                <Field label="Одиниця">
                  <Select
                    value={newUnit}
                    onValueChange={(value) => setNewUnit(value as Unit)}
                    options={UNITS.map((unit) => ({ value: unit, label: unit }))}
                  />
                </Field>
              </div>
            </>
          )}

          <Field label="Постачальник">
            <Select
              value={supplierId}
              onValueChange={setSupplierId}
              options={supplierOptions}
              placeholder="Виберіть постачальника"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Кількість (${buyProduct ? buyProduct.unit : newUnit})`}>
              <Input
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0"
                value={buyQty}
                onChange={(event) => setBuyQty(event.target.value)}
              />
            </Field>
            <Field label="Ціна за одиницю, ₴">
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={buyPrice}
                onChange={(event) => setBuyPrice(event.target.value)}
                placeholder="0,00"
              />
            </Field>
          </div>

          {!buyProduct ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Посилання: підпис" hint="Необовʼязково">
                <Input
                  value={linkLabel}
                  onChange={(event) => setLinkLabel(event.target.value)}
                  placeholder="Rozetka"
                />
              </Field>
              <Field label="Посилання: URL">
                <Input
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="https://"
                />
              </Field>
            </div>
          ) : null}

          <Switch checked={hasReceipt} onCheckedChange={setHasReceipt} label="Є фото чека" />

          <Field label="Призначення закупівлі">
            <div className="flex flex-col gap-2 rounded-md border border-border p-3">
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  checked={toOrder}
                  onChange={() => setToOrder(true)}
                  className="mt-1 accent-[var(--primary)]"
                />
                <span>
                  <span className="block text-sm">У цю заявку</span>
                  <span className="block text-xs text-muted-foreground">
                    Вкладення створиться одразу, у залишок складу позиція не потрапить.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  checked={!toOrder}
                  onChange={() => setToOrder(false)}
                  className="mt-1 accent-[var(--primary)]"
                />
                <span>
                  <span className="block text-sm">Тільки на склад</span>
                  <span className="block text-xs text-muted-foreground">
                    Партія стане на склад, вкладення додасте окремо.
                  </span>
                </span>
              </label>
            </div>
          </Field>

          <ErrorNote>{error}</ErrorNote>
        </div>
      ) : null}
    </Dialog>
  )
}
