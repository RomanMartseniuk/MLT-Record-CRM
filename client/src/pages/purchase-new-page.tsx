/**
 * "New purchase" page: always creates a purchase INTO THE WAREHOUSE.
 *
 * (A purchase straight into an order is created only from the allocation
 * dialog inside an order.) The page is a form: it collects what the user
 * typed and sends it; the server validates it, creates one batch per item at
 * its own price and returns the new purchase id.
 */

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useCreatePurchase, useStock, useSuppliers } from '@/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ErrorNote, InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { NewProductDialog } from '@/components/inventory/new-product-dialog'
import { PurchaseItemCard } from '@/components/purchases/purchase-item-card'
import type { PurchaseItemDraft } from '@/components/purchases/purchase-item-card'
import { ReceiptField } from '@/components/purchases/receipt-field'
import type { ReceiptValue } from '@/components/purchases/receipt-field'
import { formatMoney, parseMoneyToKop, parseQty } from '@/lib/format'
import { useSingleFlight } from '@/lib/use-single-flight'
import { uid } from '@/lib/utils'
import { useUi } from '@/store/ui-context'

function emptyRow(): PurchaseItemDraft {
  return { key: uid('row'), productId: '', qty: '1', price: '', note: '' }
}

export function PurchaseNewPage() {
  const { data: stock } = useStock()
  const { data: suppliers = [] } = useSuppliers()
  const createPurchase = useCreatePurchase()
  const { isMobile, toast } = useUi()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { run, pending } = useSingleFlight()

  const [supplierId, setSupplierId] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [comment, setComment] = useState('')
  const [receipt, setReceipt] = useState<ReceiptValue | null>(null)
  const [rows, setRows] = useState<PurchaseItemDraft[]>(() => [emptyRow()])
  const [error, setError] = useState('')
  /** Key of the row that asked to create a new product, or null when the dialog is closed. */
  const [newProductForRow, setNewProductForRow] = useState<string | null>(null)

  // "Replenish" on the warehouse page opens this form with `?product=`: prefill
  // one row, once, as soon as the product data has loaded (done while rendering,
  // the pattern React recommends, instead of an effect).
  const prefillProductId = searchParams.get('product')
  const [prefilled, setPrefilled] = useState(false)
  if (!prefilled && stock && prefillProductId) {
    setPrefilled(true)
    const info = stock.find((row) => row.product.id === prefillProductId)
    setRows([
      {
        key: uid('row'),
        productId: prefillProductId,
        qty: '1',
        price: info && info.avgPriceKop > 0 ? (info.avgPriceKop / 100).toFixed(2) : '',
        note: '',
      },
    ])
  }

  const productOptions = (stock ?? [])
    .filter((row) => row.product.active)
    .map((row) => ({
      value: row.product.id,
      label: `${row.product.name} (${row.product.unit})`,
      unit: row.product.unit,
    }))

  const activeSuppliers = suppliers.filter((item) => item.active)
  // Until the user chooses, the first active supplier is preselected.
  const selectedSupplier = supplierId || activeSuppliers[0]?.id || ''

  /** Preview of the total from the typed values; the server recalculates it on save. */
  const previewTotalKop = rows.reduce((acc, row) => {
    const qty = parseQty(row.qty)
    const price = parseMoneyToKop(row.price)
    if (!qty || !price) return acc
    return acc + Math.round(qty * price)
  }, 0)

  const updateRow = (key: string, patch: Partial<PurchaseItemDraft>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  const submit = () =>
    run(async () => {
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

      const result = await createPurchase.mutateAsync({
        supplierId: selectedSupplier,
        docNumber: docNumber.trim() || undefined,
        comment: comment.trim() || undefined,
        hasReceipt: Boolean(receipt),
        destination: 'warehouse',
        items,
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      toast('Закупівлю створено', {
        description: 'Позиції стали на склад окремими партіями зі своїми цінами.',
        tone: 'success',
      })
      navigate(`/purchases/${result.value.purchaseId}`)
    })

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
            {rows.map((row, index) => (
              <PurchaseItemCard
                key={row.key}
                index={index}
                row={row}
                productOptions={productOptions}
                canRemove={rows.length > 1}
                touch={isMobile}
                onChange={(patch) => updateRow(row.key, patch)}
                onRemove={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                onNewProduct={() => setNewProductForRow(row.key)}
              />
            ))}

            <Button variant="outline" onClick={() => setRows((current) => [...current, emptyRow()])}>
              <Plus />
              Додати позицію
            </Button>

            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <span className="text-sm font-medium">Разом по закупівлі</span>
              <span className="text-xl font-semibold tabular-nums">{formatMoney(previewTotalKop)}</span>
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
                  value={selectedSupplier}
                  onValueChange={setSupplierId}
                  options={activeSuppliers.map((item) => ({ value: item.id, label: item.name }))}
                  placeholder="Виберіть постачальника"
                />
              </Field>
              <Field label="Номер чека або накладної" hint="Необовʼязково">
                <Input value={docNumber} onChange={(event) => setDocNumber(event.target.value)} placeholder="НК-00123" />
              </Field>
              <Field label="Коментар" hint="Необовʼязково">
                <Textarea value={comment} onChange={(event) => setComment(event.target.value)} />
              </Field>
              <ReceiptField value={receipt} onChange={setReceipt} />
            </CardContent>
          </Card>

          <ErrorNote>{error}</ErrorNote>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size={isMobile ? 'touch' : 'lg'}
              className="flex-1"
              disabled={pending}
              onClick={() => void submit()}
            >
              Створити закупівлю
            </Button>
            <Button variant="outline" size={isMobile ? 'touch' : 'lg'} onClick={() => navigate('/purchases')}>
              Скасувати
            </Button>
          </div>

          <InfoNote>
            Закупівля завжди потрапляє на склад. Розподілити її по заявках можна зі сторінки «Склад» або всередині
            заявки. Якщо той самий товар приходить за іншою ціною, створюється окрема партія, списання йде за FIFO.
          </InfoNote>
        </div>
      </div>

      {newProductForRow ? (
        <NewProductDialog
          title="Новий товар на складі"
          onClose={() => setNewProductForRow(null)}
          onCreated={(product) => updateRow(newProductForRow, { productId: product.id })}
        />
      ) : null}
    </PageBody>
  )
}
