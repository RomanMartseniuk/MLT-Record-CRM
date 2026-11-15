/**
 * Dialog that creates a user. Only an administrator does this: there is no
 * self-registration. Individual (manager-like) permissions are granted
 * afterwards, in the permissions dialog.
 */

import { useState } from 'react'
import { useCreateUser } from '@/api'
import type { UserRole } from '@/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ErrorNote, InfoNote } from '@/components/common/page'
import { ROLE_LABELS } from '@/lib/labels'
import { useSingleFlight } from '@/lib/use-single-flight'
import { useUi } from '@/store/ui-context'

/** Mount it only while it is open: the form state starts fresh on every mount. */
export function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const createUser = useCreateUser()
  const { toast } = useUi()
  const { run, pending } = useSingleFlight()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('executor')
  const [error, setError] = useState('')

  /** A business error (bad e-mail, duplicate) is shown in the dialog. */
  const submit = () =>
    run(async () => {
      const result = await createUser.mutateAsync({ fullName, email, role, extraPermissions: [] })
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast('Користувача створено', { description: 'Самостійної реєстрації в системі немає.', tone: 'success' })
      onClose()
    })

  return (
    <Dialog
      open
      onClose={onClose}
      title="Новий користувач"
      width="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button onClick={() => void submit()} disabled={pending}>
            Створити
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Імʼя та прізвище">
          <Input autoFocus value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </Field>
        <Field label="Електронна пошта">
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Роль">
          <Select
            value={role}
            onValueChange={(value) => setRole(value as UserRole)}
            options={[
              { value: 'executor', label: ROLE_LABELS.executor },
              { value: 'admin', label: ROLE_LABELS.admin },
            ]}
          />
        </Field>
        <InfoNote>Після створення видайте індивідуальні права, якщо потрібні менеджерські можливості.</InfoNote>
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Dialog>
  )
}
