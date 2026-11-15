/**
 * Dialog that changes a user's role and individual permissions.
 *
 * Permissions that come with the role are shown checked and locked; the
 * administrator grants the rest one by one (this is how "manager" rights are
 * given: there is no manager role). Only the extra ones are sent to the server.
 */

import { useState } from 'react'
import { ALL_PERMISSIONS, ROLE_PERMISSIONS, useUpdateUser } from '@/api'
import type { Permission, User, UserRole } from '@/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/toggle'
import { PERMISSION_LABELS, ROLE_LABELS } from '@/lib/labels'
import { useSingleFlight } from '@/lib/use-single-flight'
import { useUi } from '@/store/ui-context'

/** Mount it only for a chosen user: the form state starts fresh on every mount. */
export function EditPermissionsDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const updateUser = useUpdateUser()
  const { toast } = useUi()
  const { run, pending } = useSingleFlight()

  const [role, setRole] = useState<UserRole>(user.role)
  const [extras, setExtras] = useState<Permission[]>([...user.extraPermissions])

  const base = ROLE_PERMISSIONS[role]

  const submit = () =>
    run(async () => {
      // Permissions the role already includes are not stored as individual ones.
      const individual = extras.filter((permission) => !base.includes(permission))
      const result = await updateUser.mutateAsync({ id: user.id, patch: { role, extraPermissions: individual } })
      if (!result.ok) {
        toast(result.error, { tone: 'error' })
        return
      }
      toast('Права оновлено', { tone: 'success' })
      onClose()
    })

  return (
    <Dialog
      open
      onClose={onClose}
      title="Роль та права"
      description={user.fullName}
      width="md"
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

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Права</p>
          <p className="text-xs text-muted-foreground">
            Відмічені сірим входять у роль автоматично. Решту адміністратор видає індивідуально — так
            налаштовуються менеджерські можливості.
          </p>
          <div className="flex flex-col gap-2 rounded-md border border-border p-3">
            {ALL_PERMISSIONS.map((permission) => {
              const fromRole = base.includes(permission)
              return (
                <Checkbox
                  key={permission}
                  checked={fromRole || extras.includes(permission)}
                  disabled={fromRole}
                  label={PERMISSION_LABELS[permission]}
                  description={fromRole ? 'Входить у роль' : permission}
                  onCheckedChange={(value) =>
                    setExtras((current) =>
                      value
                        ? [...current.filter((item) => item !== permission), permission]
                        : current.filter((item) => item !== permission),
                    )
                  }
                />
              )
            })}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
