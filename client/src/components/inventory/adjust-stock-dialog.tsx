/**
 * Dialog for a manual stock correction ("Коригування").
 *
 * An exceptional operation: the reason is mandatory and goes to the audit
 * log. Removing more than is in stock is refused by the server: negative
 * stock is forbidden everywhere.
 */

import { useState } from 'react'
import { useAdjustStock } from '@/api'
import type { Product } from '@/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ErrorNote, InfoNote } from '@/components/common/page'
import { parseQty } from '@/lib/format'
import { useSingleFlight } from '@/lib/use-single-flight'
import { useUi } from '@/store/ui-context'

/** Mount it only for a chosen product: the form state starts fresh on every mount. */
export function AdjustStockDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const adjustStock = useAdjustStock()
  const { toast } = useUi()
  const { run, pending } = useSingleFlight()

  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [qtyInput, setQtyInput] = useState('1')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const submit = () =>
    run(async () => {
      const qty = parseQty(qtyInput)
      if (!qty) {
        setError('Вкажіть кількість, більшу за нуль.')
        return
      }
      const result = await adjustStock.mutateAsync({
        productId: product.id,
        deltaQty: direction === 'in' ? qty : -qty,
        reason,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast('Залишок скоригований', {
        description: 'Причина збережена в журналі операцій.',
        tone: 'success',
      })
      onClose()
    })

  return (
    <Dialog
      open
      onClose={onClose}
      title="Коригування залишку"
      description={product.name}
      width="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button onClick={() => void submit()} disabled={pending}>
            Зберегти
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <InfoNote>Ручне коригування — виняткова операція. Причина обовʼязкова й збережеться в журналі.</InfoNote>
        <Field label="Напрямок">
          <Select
            value={direction}
            onValueChange={(value) => setDirection(value as 'in' | 'out')}
            options={[
              { value: 'in', label: 'Додати на склад' },
              { value: 'out', label: 'Списати зі складу' },
            ]}
          />
        </Field>
        <Field label={`Кількість (${product.unit})`}>
          <Input
            type="number"
            inputMode="decimal"
            step="0.001"
            min="0"
            value={qtyInput}
            onChange={(event) => setQtyInput(event.target.value)}
          />
        </Field>
        <Field label="Причина">
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Наприклад: інвентаризація, знайдено залишок"
          />
        </Field>
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Dialog>
  )
}
