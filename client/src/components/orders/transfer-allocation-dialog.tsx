/**
 * Moves an allocation to another order.
 *
 * Moving does not touch the warehouse and creates no new purchase: the batch
 * price is kept and the total of purchases stays the same. If the source or
 * the target order is issued ("Видано"), a reason is mandatory.
 */

import { useState } from 'react'
import { useOrders, useTransferAllocation } from '@/api'
import type { AllocationRow, OrderDetail } from '@/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ErrorNote, InfoNote } from '@/components/common/page'
import { useSingleFlight } from '@/lib/use-single-flight'
import { useUi } from '@/store/ui-context'

/** Mount it only for a chosen allocation: the form state starts fresh on every mount. */
export function TransferAllocationDialog({
  order,
  row,
  onClose,
}: {
  order: OrderDetail
  row: AllocationRow
  onClose: () => void
}) {
  const { data: orders = [] } = useOrders()
  const transfer = useTransferAllocation()
  const { toast } = useUi()
  const { run, pending } = useSingleFlight()

  const [targetId, setTargetId] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const options = orders
    .filter((item) => item.order.id !== order.order.id)
    .map((item) => ({ value: item.order.id, label: `№ ${item.order.number} · ${item.order.malfunction.slice(0, 40)}` }))

  const submit = () =>
    run(async () => {
      if (!targetId) {
        setError('Виберіть заявку, на яку переносимо.')
        return
      }
      const result = await transfer.mutateAsync({
        id: row.allocation.id,
        toOrderId: targetId,
        reason: reason.trim() || undefined,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      const target = orders.find((item) => item.order.id === targetId)
      toast('Вкладення перенесено', {
        description: `${row.productName} → заявка № ${target?.order.number}. Загальна сума закупівель не змінилась.`,
        tone: 'success',
      })
      onClose()
    })

  return (
    <Dialog
      open
      onClose={onClose}
      title="Перенести на іншу заявку"
      description={row.productName}
      width="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button onClick={() => void submit()} disabled={pending}>
            Перенести
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <InfoNote>
          Перенесення не змінює склад і не створює повторної закупівлі: ціна партії зберігається, а загальна сума
          закупівель залишається тією самою.
        </InfoNote>
        <Field label="Заявка-отримувач">
          <Select value={targetId} onValueChange={setTargetId} options={options} placeholder="Виберіть заявку" />
        </Field>
        <Field label="Причина зміни" hint="Обовʼязково, якщо заявка закрита (з якої або на яку переносимо)">
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Dialog>
  )
}
