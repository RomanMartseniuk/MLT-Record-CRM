import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ErrorNote, InfoNote } from '@/components/common/page'
import { planFifo, productStock, fifoBatches } from '@/domain/calc'
import { isOrderLocked } from '@/domain/labels'
import { addAllocation } from '@/domain/ops'
import { formatMoney, formatQty, parseQty } from '@/lib/format'
import { useDb } from '@/store/db-store'
import { useUi } from '@/store/ui-store'
import type { Product } from '@/domain/types'

/** Розподіл товару зі складу в заявку. Ціну визначає FIFO. */
export function AllocateProductDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { db, apply, currentUser } = useDb()
  const { toast } = useUi()
  const [orderId, setOrderId] = useState('')
  const [qtyInput, setQtyInput] = useState('1')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!product) return
    setOrderId('')
    setQtyInput('1')
    setError('')
  }, [product])

  const orderOptions = useMemo(
    () =>
      db.orders
        .filter((order) => !isOrderLocked(db, order.rawStatus))
        .map((order) => ({ value: order.id, label: `№ ${order.number} · ${order.malfunction.slice(0, 40)}` })),
    [db],
  )

  if (!product) return null

  const stock = productStock(db, product.id)
  const qty = parseQty(qtyInput)
  const plan = qty ? planFifo(fifoBatches(db, product.id), qty) : null

  const submit = () => {
    if (!currentUser) return
    if (!qty) {
      setError('Вкажіть кількість, більшу за нуль.')
      return
    }
    if (!orderId) {
      setError('Виберіть заявку.')
      return
    }
    if (qty > stock.qty) {
      setError(`На складі лише ${formatQty(stock.qty, product.unit)}.`)
      return
    }
    const result = apply((draft) =>
      addAllocation(draft, { orderId, productId: product.id, qty }, currentUser.id),
    )
    if (!result.ok) {
      setError(result.error)
      return
    }
    const order = db.orders.find((item) => item.id === orderId)
    toast('Товар розподілено', {
      description: `${product.name} → заявка № ${order?.number}. Сума ${formatMoney(result.value.totalKop)}.`,
      tone: 'success',
    })
    onClose()
  }

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
          <Button onClick={submit}>Розподілити</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <InfoNote>
          Ціна візьметься автоматично за FIFO. На складі {formatQty(stock.qty, product.unit)}.
        </InfoNote>
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
