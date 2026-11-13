import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Textarea } from '@/components/ui/input'
import { ErrorNote, InfoNote } from './page'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  /** Текст попередження про наслідки операції. */
  warning?: string
  confirmLabel: string
  tone?: 'default' | 'destructive'
  /** Якщо true — причина обовʼязкова (закрита заявка, коригування, скасування). */
  requireReason?: boolean
  reasonLabel?: string
  onClose: () => void
  onConfirm: (reason: string) => { ok: boolean; error?: string }
}

/**
 * Підтвердження небезпечної дії. Для закритих заявок і коригувань
 * причина обовʼязкова й потім видна в журналі операцій.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  warning,
  confirmLabel,
  tone = 'default',
  requireReason,
  reasonLabel = 'Причина зміни',
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setReason('')
      setError('')
    }
  }, [open])

  const submit = () => {
    if (requireReason && !reason.trim()) {
      setError('Вкажіть причину — вона буде збережена в журналі операцій.')
      return
    }
    const result = onConfirm(reason.trim())
    if (!result.ok) {
      setError(result.error ?? 'Не вдалося виконати операцію.')
      return
    }
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      width="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button variant={tone === 'destructive' ? 'destructive' : 'default'} onClick={submit}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {warning ? <InfoNote>{warning}</InfoNote> : null}
        {requireReason ? (
          <Field label={reasonLabel} hint="Обовʼязкове поле. Запис зберігається в журналі.">
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Наприклад: помилково списано не на ту заявку"
            />
          </Field>
        ) : null}
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Dialog>
  )
}
