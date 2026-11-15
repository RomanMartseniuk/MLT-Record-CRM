/**
 * Allocate a product from the warehouse into an order ("Розподілити").
 *
 * The user picks an order and a quantity; the price is never typed: the
 * server takes it from the warehouse batches by FIFO. The approximate sum
 * shown here is the server's FIFO preview, not a calculation in the UI.
 */

import { useState } from 'react'
import { useAddAllocation, useFifoPreview, useOrders, useStock } from '@/api'
import type { Product } from '@/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ErrorNote, InfoNote } from '@/components/common/page'
import { formatMoney, formatQty, parseQty } from '@/lib/format'
import { useSingleFlight } from '@/lib/use-single-flight'
import { useUi } from '@/store/ui-context'

/** Mount it only for a chosen product: the form state starts fresh on every mount. */
export function AllocateProductDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const { data: orders = [] } = useOrders()
  const { data: stockRows } = useStock()
  const addAllocation = useAddAllocation()
  const { toast } = useUi()
  const { run, pending } = useSingleFlight()

  const [orderId, setOrderId] = useState('')
  const [qtyInput, setQtyInput] = useState('1')
  const [error, setError] = useState('')

  // Only orders that are not issued can receive a plain allocation.
  const orderOptions = orders
    .filter((row) => !row.locked)
    .map((row) => ({ value: row.order.id, label: `№ ${row.order.number} · ${row.order.malfunction.slice(0, 40)}` }))

  const stockQty = stockRows?.find((row) => row.product.id === product.id)?.qty ?? 0
  const qty = parseQty(qtyInput)
  const { data: plan } = useFifoPreview(product.id, qty)

  const submit = () =>
    run(async () => {
      if (!qty) {
        setError('Вкажіть кількість, більшу за нуль.')
        return
      }
      if (!orderId) {
        setError('Виберіть заявку.')
        return
      }
      if (qty > stockQty) {
        setError(`На складі лише ${formatQty(stockQty, product.unit)}.`)
        return
      }
      const result = await addAllocation.mutateAsync({ orderId, productId: product.id, qty })
      if (!result.ok) {
        setError(result.error)
        return
      }
      const order = orders.find((row) => row.order.id === orderId)
      toast('Товар розподілено', {
        description: `${product.name} → заявка № ${order?.order.number}. Сума ${formatMoney(result.value.totalKop)}.`,
        tone: 'success',
      })
      onClose()
    })

  return (
    <Dialog
      open
      onClose={onClose}
      title="Розподілити в заявку"
      description={product.name}
      width="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button onClick={() => void submit()} disabled={pending}>
            Розподілити
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <InfoNote>Ціна візьметься автоматично за FIFO. На складі {formatQty(stockQty, product.unit)}.</InfoNote>
        <Field label="Заявка">
          <Select value={orderId} onValueChange={setOrderId} options={orderOptions} placeholder="Виберіть заявку" />
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
        {plan && plan.shortfall <= 0 ? (
          <p className="text-sm text-muted-foreground">
            Орієнтовна сума: <span className="font-medium text-foreground">{formatMoney(plan.totalKop)}</span>
          </p>
        ) : null}
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Dialog>
  )
}
