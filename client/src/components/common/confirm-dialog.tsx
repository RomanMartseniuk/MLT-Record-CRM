import { useState } from 'react'
import { useSingleFlight } from '@/lib/use-single-flight'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Textarea } from '@/components/ui/input'
import { ErrorNote, InfoNote } from './page'

/** What the confirmed action reports back: success, or an error to show in the dialog. */
export interface ConfirmResult {
  ok: boolean
  error?: string
}

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  /** Warning text about the consequences of the operation. */
  warning?: string
  confirmLabel: string
  tone?: 'default' | 'destructive'
  /** When true the reason is mandatory (closed order, adjustment, cancellation). */
  requireReason?: boolean
  reasonLabel?: string
  onClose: () => void
  /** May be asynchronous (an API call); the dialog waits and blocks repeated clicks meanwhile. */
  onConfirm: (reason: string) => ConfirmResult | Promise<ConfirmResult>
}

/**
 * Confirmation of a dangerous action. For closed orders and adjustments the
 * reason is mandatory and is later visible in the audit log.
 *
 * While the action is running the buttons are disabled, so a second click
 * cannot send the operation twice.
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
  const [wasOpen, setWasOpen] = useState(open)
  const { run, pending } = useSingleFlight()

  // Reset the form each time the dialog opens. Done while rendering (the
  // pattern React recommends) instead of in an effect, to avoid a cascading render.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setReason('')
      setError('')
    }
  }

  const submit = () =>
    run(async () => {
      if (requireReason && !reason.trim()) {
        setError('Вкажіть причину — вона буде збережена в журналі операцій.')
        return
      }
      const result = await onConfirm(reason.trim())
      if (!result.ok) {
        setError(result.error ?? 'Не вдалося виконати операцію.')
        return
      }
      onClose()
    })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      width="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Скасувати
          </Button>
          <Button
            variant={tone === 'destructive' ? 'destructive' : 'default'}
            onClick={() => void submit()}
            disabled={pending}
          >
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
