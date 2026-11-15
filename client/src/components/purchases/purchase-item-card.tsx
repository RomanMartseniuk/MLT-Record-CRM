/**
 * One item of the purchase form: a product, a quantity, a price per unit.
 *
 * It only edits the form row it is given. The sum shown is a preview of
 * what the user typed (quantity × price); the real total is calculated by
 * the server when the purchase is saved.
 */

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Label } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatMoney, parseMoneyToKop, parseQty } from '@/lib/format'

/** The text the user typed into one item row (kept as strings until submit). */
export interface PurchaseItemDraft {
  key: string
  productId: string
  qty: string
  price: string
  note: string
}

export interface ProductOption {
  value: string
  label: string
  unit: string
}

export function PurchaseItemCard({
  index,
  row,
  productOptions,
  canRemove,
  touch,
  onChange,
  onRemove,
  onNewProduct,
}: {
  index: number
  row: PurchaseItemDraft
  productOptions: ProductOption[]
  canRemove: boolean
  /** Use touch-sized buttons (mobile mode). */
  touch: boolean
  onChange: (patch: Partial<PurchaseItemDraft>) => void
  onRemove: () => void
  onNewProduct: () => void
}) {
  const unit = productOptions.find((option) => option.value === row.productId)?.unit
  const qty = parseQty(row.qty)
  const price = parseMoneyToKop(row.price)

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Позиція {index + 1}</Label>
        {canRemove ? (
          <Button variant="ghost" size="icon-sm" aria-label="Видалити позицію" onClick={onRemove}>
            <Trash2 />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="Товар" className="min-w-0 flex-1">
          <Select
            value={row.productId}
            onValueChange={(value) => onChange({ productId: value })}
            options={productOptions.map(({ value, label }) => ({ value, label }))}
            placeholder="Виберіть товар"
          />
        </Field>
        <Button variant="outline" size={touch ? 'touch' : 'default'} onClick={onNewProduct}>
          <Plus />
          Новий товар
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Field label={`Кількість${unit ? ` (${unit})` : ''}`}>
          <Input
            type="number"
            inputMode="decimal"
            step="0.001"
            min="0"
            value={row.qty}
            onChange={(event) => onChange({ qty: event.target.value })}
          />
        </Field>
        <Field label="Ціна за од., ₴">
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={row.price}
            onChange={(event) => onChange({ price: event.target.value })}
            placeholder="0,00"
          />
        </Field>
        <Field label="Сума">
          <Input readOnly value={qty && price ? formatMoney(Math.round(qty * price)) : '—'} className="bg-muted" />
        </Field>
      </div>

      <Field label="Примітка" hint="Необовʼязково">
        <Input
          value={row.note}
          onChange={(event) => onChange({ note: event.target.value })}
          placeholder="Наприклад: аналог, інший виробник"
        />
      </Field>
    </div>
  )
}
