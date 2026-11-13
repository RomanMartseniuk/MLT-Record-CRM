import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Camera, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Label, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ErrorNote, InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { productStock } from '@/domain/calc'
import { createProduct, createPurchase } from '@/domain/ops'
import { formatMoney, parseMoneyToKop, parseQty } from '@/lib/format'
import { uid } from '@/lib/utils'
import { useDb } from '@/store/db-store'
import { useUi } from '@/store/ui-store'
import type { Unit } from '@/domain/types'

const UNITS: Unit[] = ['шт', 'л', 'кг', 'м']

interface ItemRow {
  key: string
  productId: string
  qty: string
  price: string
  note: string
}

function emptyRow(): ItemRow {
  return { key: uid('row'), productId: '', qty: '1', price: '', note: '' }
}

export function PurchaseNewPage() {
  const { db, apply, currentUser } = useDb()
  const { isMobile, toast } = useUi()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [supplierId, setSupplierId] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [comment, setComment] = useState('')
  const [receiptName, setReceiptName] = useState('')
  const [receiptPreview, setReceiptPreview] = useState('')
  const [rows, setRows] = useState<ItemRow[]>(() => [emptyRow()])
  const [error, setError] = useState('')

  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategoryId, setNewCategoryId] = useState('')
  const [newUnit, setNewUnit] = useState<Unit>('шт')
  const [productError, setProductError] = useState('')
  const [pendingRowKey, setPendingRowKey] = useState('')

  useEffect(() => {
    setSupplierId(db.suppliers.find((item) => item.active)?.id ?? '')
    setNewCategoryId(db.categories.find((item) => item.kind === 'product' && item.active)?.id ?? '')

    const prefillProduct = searchParams.get('product')
    if (prefillProduct) {
      const info = productStock(db, prefillProduct)
      setRows([
        {
          key: uid('row'),
          productId: prefillProduct,
          qty: '1',
          price: info.avgPriceKop > 0 ? (info.avgPriceKop / 100).toFixed(2) : '',
          note: '',
        },
      ])
    }
    // Префіл робимо один раз при відкритті сторінки.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const productOptions = useMemo(
    () =>
      db.products
        .filter((item) => item.active)
        .map((item) => ({ value: item.id, label: `${item.name} (${item.unit})` })),
    [db.products],
  )

  const supplierOptions = db.suppliers
    .filter((item) => item.active)
    .map((item) => ({ value: item.id, label: item.name }))

  const totalKop = rows.reduce((acc, row) => {
    const qty = parseQty(row.qty)
    const price = parseMoneyToKop(row.price)
    if (!qty || !price) return acc
    return acc + Math.round(qty * price)
  }, 0)

  const updateRow = (key: string, patch: Partial<ItemRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const openProductDialog = (rowKey: string) => {
    setPendingRowKey(rowKey)
    setNewName('')
    setNewUnit('шт')
    setProductError('')
    setProductDialogOpen(true)
  }

  const submitNewProduct = () => {
    if (!currentUser) return
    const result = apply((draft) =>
      createProduct(draft, { name: newName, categoryId: newCategoryId, unit: newUnit, links: [] }, currentUser.id),
    )
    if (!result.ok) {
      setProductError(result.error)
      return
    }
    if (pendingRowKey) updateRow(pendingRowKey, { productId: result.value.id })
    toast('Товар створено', { description: `${result.value.name} додано в довідник.`, tone: 'success' })
    setProductDialogOpen(false)
  }

  const submit = () => {
    if (!currentUser) return
    const items = rows
      .map((row) => {
        const qty = parseQty(row.qty)
        const unitPriceKop = parseMoneyToKop(row.price)
        if (!row.productId || !qty || !unitPriceKop) return null
        return { productId: row.productId, qty, unitPriceKop, note: row.note.trim() || undefined }
      })
      .filter((item) => item !== null)

    if (items.length !== rows.length) {
      setError('У кожній позиції заповніть товар, кількість і ціну.')
      return
    }

    const result = apply((draft) =>
      createPurchase(
        draft,
        {
          supplierId,
          docNumber: docNumber.trim() || undefined,
          comment: comment.trim() || undefined,
          hasReceipt: Boolean(receiptName),
          destination: 'warehouse',
          items,
        },
        currentUser.id,
      ),
    )

    if (!result.ok) {
      setError(result.error)
      return
    }

    toast('Закупівлю створено', {
      description: 'Позиції стали на склад окремими партіями зі своїми цінами.',
      tone: 'success',
    })
    navigate(`/purchases/${result.value.purchaseId}`)
  }

  return (
    <PageBody>
      <PageHeader
        crumbs={[{ label: 'Закупівлі', to: '/purchases' }, { label: 'Нова закупівля' }]}
        title="Нова закупівля"
        description="Одна закупівля може містити кілька позицій. Сума рахується автоматично."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Позиції закупівлі</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {rows.map((row, index) => {
              const product = db.products.find((item) => item.id === row.productId)
              const qty = parseQty(row.qty)
              const price = parseMoneyToKop(row.price)
              return (
                <div key={row.key} className="flex flex-col gap-3 rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Позиція {index + 1}</Label>
                    {rows.length > 1 ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Видалити позицію"
                        onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <Field label="Товар" className="min-w-0 flex-1">
                      <Select
                        value={row.productId}
                        onValueChange={(value) => updateRow(row.key, { productId: value })}
                        options={productOptions}
                        placeholder="Виберіть товар"
                      />
                    </Field>
                    <Button variant="outline" size={isMobile ? 'touch' : 'default'} onClick={() => openProductDialog(row.key)}>
                      <Plus />
                      Новий товар
                    </Button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <Field label={`Кількість${product ? ` (${product.unit})` : ''}`}>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.001"
                        min="0"
                        value={row.qty}
                        onChange={(event) => updateRow(row.key, { qty: event.target.value })}
                      />
                    </Field>
                    <Field label="Ціна за од., ₴">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={row.price}
                        onChange={(event) => updateRow(row.key, { price: event.target.value })}
                        placeholder="0,00"
                      />
                    </Field>
                    <Field label="Сума">
                      <Input
                        readOnly
                        value={qty && price ? formatMoney(Math.round(qty * price)) : '—'}
                        className="bg-muted"
                      />
                    </Field>
                  </div>

                  <Field label="Примітка" hint="Необовʼязково">
                    <Input
                      value={row.note}
                      onChange={(event) => updateRow(row.key, { note: event.target.value })}
                      placeholder="Наприклад: аналог, інший виробник"
                    />
                  </Field>
                </div>
              )
            })}

            <Button variant="outline" onClick={() => setRows((current) => [...current, emptyRow()])}>
              <Plus />
              Додати позицію
            </Button>

            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <span className="text-sm font-medium">Разом по закупівлі</span>
              <span className="text-xl font-semibold tabular-nums">{formatMoney(totalKop)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Основне</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field label="Постачальник">
                <Select
                  value={supplierId}
                  onValueChange={setSupplierId}
                  options={supplierOptions}
                  placeholder="Виберіть постачальника"
                />
              </Field>
              <Field label="Номер чека або накладної" hint="Необовʼязково">
                <Input value={docNumber} onChange={(event) => setDocNumber(event.target.value)} placeholder="НК-00123" />
              </Field>
              <Field label="Коментар" hint="Необовʼязково">
                <Textarea value={comment} onChange={(event) => setComment(event.target.value)} />
              </Field>
              <Field label="Фото чека">
                {receiptPreview ? (
                  <div className="flex items-center gap-2 rounded-md border border-border p-2">
                    <img src={receiptPreview} alt="Чек" className="size-12 rounded-sm object-cover" />
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{receiptName}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Прибрати фото"
                      onClick={() => {
                        setReceiptName('')
                        setReceiptPreview('')
                      }}
                    >
                      <X />
                    </Button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground hover:bg-muted">
                    <Camera className="size-4" />
                    Додати фото чека
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files && event.target.files[0]
                        if (!file) return
                        setReceiptName(file.name)
                        setReceiptPreview(URL.createObjectURL(file))
                      }}
                    />
                  </label>
                )}
              </Field>
            </CardContent>
          </Card>

          <ErrorNote>{error}</ErrorNote>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size={isMobile ? 'touch' : 'lg'} className="flex-1" onClick={submit}>
              Створити закупівлю
            </Button>
            <Button variant="outline" size={isMobile ? 'touch' : 'lg'} onClick={() => navigate('/purchases')}>
              Скасувати
            </Button>
          </div>

          <InfoNote>
            Закупівля завжди потрапляє на склад. Розподілити її по заявках можна зі сторінки «Склад» або всередині заявки. Якщо той самий товар приходить за іншою ціною, створюється окрема партія, списання йде за FIFO.
          </InfoNote>
        </div>
      </div>

      <Dialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        title="Новий товар на складі"
        width="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>
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
          <ErrorNote>{productError}</ErrorNote>
        </div>
      </Dialog>
    </PageBody>
  )
}
