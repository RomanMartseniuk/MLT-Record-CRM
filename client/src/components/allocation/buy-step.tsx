/**
 * Step 3 of "Add allocation": buy a product that is not in stock.
 *
 * Two cases: replenish an existing product that ran out, or create a brand
 * new product together with the purchase (the server does both in one atomic
 * operation, so a refused purchase leaves no orphan product).
 *
 * The purchase goes either straight into this order (an allocation is created
 * at once and the stock is not touched) or only into the warehouse.
 */

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useCategories, useCreatePurchase, useSuppliers } from '@/api'
import type { OrderRow, StockRow, Unit } from '@/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/toggle'
import { ErrorNote, InfoNote } from '@/components/common/page'
import { formatMoney, formatQty, kopToInput, parseMoneyToKop, parseQty } from '@/lib/format'
import { useSingleFlight } from '@/lib/use-single-flight'
import { uid } from '@/lib/utils'
import { useUi } from '@/store/ui-context'
import { ClosedOrderNote } from './closed-order-note'

const UNITS: Unit[] = ['шт', 'л', 'кг', 'м']

export function BuyStep({
  order,
  existing,
  initialName,
  onBack,
  onClose,
}: {
  order: OrderRow
  /** A product without stock to replenish, or null to create a new product. */
  existing: StockRow | null
  /** Name typed in the search, offered as the name of a new product. */
  initialName: string
  onBack: () => void
  onClose: () => void
}) {
  const { data: categories = [] } = useCategories()
  const { data: suppliers = [] } = useSuppliers()
  const createPurchase = useCreatePurchase()
  const { toast } = useUi()
  const { run, pending } = useSingleFlight()

  const [newName, setNewName] = useState(initialName)
  const [categoryId, setCategoryId] = useState('')
  const [unit, setUnit] = useState<Unit>(existing ? existing.product.unit : 'шт')
  const [supplierId, setSupplierId] = useState('')
  const [qtyInput, setQtyInput] = useState('1')
  const [priceInput, setPriceInput] = useState(existing && existing.avgPriceKop > 0 ? kopToInput(existing.avgPriceKop) : '')
  const [hasReceipt, setHasReceipt] = useState(false)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [toOrder, setToOrder] = useState(true)
  const [error, setError] = useState('')

  const categoryOptions = categories
    .filter((item) => item.kind === 'product' && item.active)
    .map((item) => ({ value: item.id, label: item.name }))
  const supplierOptions = suppliers.filter((item) => item.active).map((item) => ({ value: item.id, label: item.name }))
  // Until the user chooses, the first active category and supplier are preselected.
  const selectedCategory = categoryId || categoryOptions[0]?.value || ''
  const selectedSupplier = supplierId || supplierOptions[0]?.value || ''

  const productName = existing ? existing.product.name : newName.trim()

  const submit = () =>
    run(async () => {
      const qty = parseQty(qtyInput)
      const unitPriceKop = parseMoneyToKop(priceInput)

      if (!qty) return setError('Вкажіть кількість закупівлі, більшу за нуль.')
      if (!unitPriceKop || unitPriceKop <= 0) return setError('Вкажіть ціну за одиницю.')
      if (!selectedSupplier) return setError('Виберіть постачальника.')
      if (!existing && !newName.trim()) return setError('Вкажіть назву нового товару.')
      if (!existing && !selectedCategory) return setError('Виберіть категорію для нового товару.')

      const item = existing
        ? { productId: existing.product.id, qty, unitPriceKop }
        : {
            newProduct: {
              name: newName,
              categoryId: selectedCategory,
              unit,
              links:
                linkUrl.trim() && linkLabel.trim()
                  ? [{ id: uid('lnk'), label: linkLabel.trim(), url: linkUrl.trim() }]
                  : [],
            },
            qty,
            unitPriceKop,
          }

      const result = await createPurchase.mutateAsync({
        supplierId: selectedSupplier,
        hasReceipt,
        destination: toOrder ? 'order' : 'warehouse',
        orderId: toOrder ? order.order.id : undefined,
        comment: toOrder ? `Закупівля під заявку № ${order.order.number}` : undefined,
        items: [item],
      })
      if (!result.ok) return setError(result.error)

      const unitLabel = existing ? existing.product.unit : unit
      if (toOrder) {
        toast('Закупівлю оформлено і додано у заявку', {
          description: `${productName}: ${formatQty(qty, unitLabel)} × ${formatMoney(unitPriceKop)}. На склад позиція не потрапляє.`,
          tone: 'success',
        })
      } else {
        toast('Закупівлю оформлено на склад', {
          description: `${productName}: ${formatQty(qty, unitLabel)}. Тепер позицію можна розподілити у заявку.`,
          tone: 'success',
        })
      }
      onClose()
    })

  return (
    <Dialog
      open
      onClose={onClose}
      title={existing ? `Закупівля: ${existing.product.name}` : 'Новий продукт і закупівля'}
      description={`Заявка № ${order.order.number}`}
      width="md"
      footer={
        <>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft />
            Назад
          </Button>
          <Button onClick={() => void submit()} disabled={pending}>
            {toOrder ? 'Оформити і додати' : 'Оформити на склад'}
          </Button>
        </>
      }
    >
      <ClosedOrderNote locked={order.locked} />
      <div className="flex flex-col gap-4">
        {existing ? (
          <InfoNote>
            Поповнення складу для «{existing.product.name}». Нова партія отримає власну ціну, історична собівартість
            попередніх вкладень не зміниться.
          </InfoNote>
        ) : (
          <>
            <Field label="Назва товару">
              <Input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Категорія">
                <Select value={selectedCategory} onValueChange={setCategoryId} options={categoryOptions} />
              </Field>
              <Field label="Одиниця">
                <Select
                  value={unit}
                  onValueChange={(value) => setUnit(value as Unit)}
                  options={UNITS.map((item) => ({ value: item, label: item }))}
                />
              </Field>
            </div>
          </>
        )}

        <Field label="Постачальник">
          <Select
            value={selectedSupplier}
            onValueChange={setSupplierId}
            options={supplierOptions}
            placeholder="Виберіть постачальника"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Кількість (${existing ? existing.product.unit : unit})`}>
            <Input
              type="number"
              inputMode="decimal"
              step="0.001"
              min="0"
              value={qtyInput}
              onChange={(event) => setQtyInput(event.target.value)}
            />
          </Field>
          <Field label="Ціна за одиницю, ₴">
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={priceInput}
              onChange={(event) => setPriceInput(event.target.value)}
              placeholder="0,00"
            />
          </Field>
        </div>

        {!existing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Посилання: підпис" hint="Необовʼязково">
              <Input value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="Rozetka" />
            </Field>
            <Field label="Посилання: URL">
              <Input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://" />
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
    </Dialog>
  )
}
