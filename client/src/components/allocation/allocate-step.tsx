/**
 * Step 2 of "Add allocation": choose the quantity of the picked product.
 *
 * The FIFO breakdown shown here is the server's preview (`useFifoPreview`),
 * not a calculation in the UI. Saving sends only the product and the
 * quantity: the price is decided by the server from the warehouse batches.
 */

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useAddAllocation, useFifoPreview } from '@/api'
import type { OrderRow, StockRow } from '@/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { ErrorNote } from '@/components/common/page'
import { PhotoTile } from '@/components/common/stat'
import { formatDate, formatMoney, formatQty, parseQty } from '@/lib/format'
import { useSingleFlight } from '@/lib/use-single-flight'
import { useUi } from '@/store/ui-context'
import { ClosedOrderNote } from './closed-order-note'

export function AllocateStep({
  order,
  row,
  onBack,
  onClose,
}: {
  order: OrderRow
  row: StockRow
  onBack: () => void
  onClose: () => void
}) {
  const addAllocation = useAddAllocation()
  const { toast } = useUi()
  const { run, pending } = useSingleFlight()

  const [qtyInput, setQtyInput] = useState('1')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const { product } = row
  const qty = parseQty(qtyInput)
  const { data: plan } = useFifoPreview(product.id, qty)

  const submit = () =>
    run(async () => {
      if (!qty) {
        setError('Вкажіть кількість, більшу за нуль.')
        return
      }
      const result = await addAllocation.mutateAsync({
        orderId: order.order.id,
        productId: product.id,
        qty,
        reason: reason.trim() || undefined,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast('Вкладення додано', {
        description: `${product.name}: ${formatQty(qty, product.unit)} на суму ${formatMoney(result.value.totalKop)}. Залишок на складі зменшено.`,
        tone: 'success',
      })
      onClose()
    })

  return (
    <Dialog
      open
      onClose={onClose}
      title="Кількість і ціна"
      description={`Заявка № ${order.order.number}`}
      width="md"
      footer={
        <>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft />
            Назад
          </Button>
          <Button onClick={() => void submit()} disabled={pending || !plan || plan.shortfall > 0}>
            Додати вкладення
          </Button>
        </>
      }
    >
      <ClosedOrderNote locked={order.locked} />
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-md border border-border p-3">
          <PhotoTile tone={product.photoTone} name={product.name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{product.name}</p>
            <p className="text-xs text-muted-foreground">
              Доступно {formatQty(row.qty, product.unit)} · {row.batchCount}{' '}
              {row.batchCount === 1 ? 'партія' : 'партії'}
            </p>
          </div>
        </div>

        <Field
          label={`Кількість (${product.unit})`}
          hint={`Максимум ${formatQty(row.qty, product.unit)}`}
          error={qty && qty > row.qty ? 'Більше, ніж є на складі.' : undefined}
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
            {plan.lines.map((line) => (
              <div key={line.batchId} className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  Партія від {line.receivedAt ? formatDate(line.receivedAt) : '—'} · {formatMoney(line.unitPriceKop)}/
                  {product.unit}
                </span>
                <span className="tabular-nums">
                  {formatQty(line.qty, product.unit)} = {formatMoney(Math.round(line.qty * line.unitPriceKop))}
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-baseline justify-between border-t border-border pt-2 text-sm">
              <span className="font-medium">Разом</span>
              <span className="font-semibold tabular-nums">{formatMoney(plan.totalKop)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Залишок після операції: {formatQty(row.qty - (qty ?? 0), product.unit)}
            </p>
          </div>
        ) : null}

        {order.locked ? (
          <Field label="Причина зміни" hint="Обовʼязково для закритої заявки">
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
        ) : null}

        <ErrorNote>{error}</ErrorNote>
      </div>
    </Dialog>
  )
}
