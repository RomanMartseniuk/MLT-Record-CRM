import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/toggle'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrap,
} from '@/components/ui/table'
import { ErrorNote, InfoNote, PageBody, PageHeader } from '@/components/common/page'
import {
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
} from '@/domain/permissions'
import { createUser, updateUser } from '@/domain/ops'
import { useDb } from '@/store/db-store'
import { useUi } from '@/store/ui-store'
import type { Permission, User, UserRole } from '@/domain/types'

export function UsersPage() {
  const { db, apply, currentUser } = useDb()
  const { isMobile, toast } = useUi()

  const [createOpen, setCreateOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('executor')
  const [createError, setCreateError] = useState('')

  const [editing, setEditing] = useState<User | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('executor')
  const [editExtras, setEditExtras] = useState<Permission[]>([])

  const openEdit = (user: User) => {
    setEditing(user)
    setEditRole(user.role)
    setEditExtras([...user.extraPermissions])
  }

  const submitCreate = () => {
    if (!currentUser) return
    const result = apply((draft) =>
      createUser(draft, { fullName, email, role, extraPermissions: [] }, currentUser.id),
    )
    if (!result.ok) {
      setCreateError(result.error)
      return
    }
    toast('Користувача створено', { description: 'Самостійної реєстрації в системі немає.', tone: 'success' })
    setCreateOpen(false)
    setFullName('')
    setEmail('')
  }

  const submitEdit = () => {
    if (!currentUser || !editing) return
    const base = ROLE_PERMISSIONS[editRole]
    const extras = editExtras.filter((permission) => !base.includes(permission))
    apply((draft) => updateUser(draft, editing.id, { role: editRole, extraPermissions: extras }, currentUser.id))
    toast('Права оновлено', { tone: 'success' })
    setEditing(null)
  }

  const toggleBlocked = (user: User) => {
    if (!currentUser) return
    apply((draft) => updateUser(draft, user.id, { blocked: !user.blocked }, currentUser.id))
  }

  const baseForEdit = ROLE_PERMISSIONS[editRole]

  return (
    <PageBody>
      <PageHeader
        title="Користувачі"
        description="Дві роли в MVP. Менеджерські права видаються індивідуально поверх роли виконавця."
        actions={
          <Button
            size={isMobile ? 'touch' : 'default'}
            onClick={() => {
              setCreateError('')
              setCreateOpen(true)
            }}
          >
            <Plus />
            Новий користувач
          </Button>
        }
      />

      <Card>
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Імʼя</TableHead>
                <TableHead>Пошта</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Індивідуальні права</TableHead>
                <TableHead>RO App</TableHead>
                <TableHead>Стан</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {db.users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>{ROLE_LABELS[user.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.extraPermissions.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.extraPermissions.map((permission) => (
                          <Badge key={permission} variant="secondary">
                            {PERMISSION_LABELS[permission]}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.roAppName ?? '—'}</TableCell>
                  <TableCell>
                    {user.blocked ? (
                      <Badge variant="destructive">Заблокований</Badge>
                    ) : (
                      <Badge variant="outline">Активний</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                        Права
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={user.id === currentUser?.id}
                        onClick={() => toggleBlocked(user)}
                      >
                        {user.blocked ? 'Розблокувати' : 'Заблокувати'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrap>
      </Card>

      <InfoNote>
        Перевірка прав виконується на сервері. Інтерфейс лише ховає недоступні дії, але не є захистом.
      </InfoNote>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Новий користувач"
        width="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={submitCreate}>Створити</Button>
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
          <ErrorNote>{createError}</ErrorNote>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Роль та права"
        description={editing ? editing.fullName : undefined}
        width="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Скасувати
            </Button>
            <Button onClick={submitEdit}>Зберегти</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Роль">
            <Select
              value={editRole}
              onValueChange={(value) => setEditRole(value as UserRole)}
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
                const fromRole = baseForEdit.includes(permission)
                const checked = fromRole || editExtras.includes(permission)
                return (
                  <Checkbox
                    key={permission}
                    checked={checked}
                    disabled={fromRole}
                    label={PERMISSION_LABELS[permission]}
                    description={fromRole ? 'Входить у роль' : permission}
                    onCheckedChange={(value) => {
                      setEditExtras((current) =>
                        value
                          ? [...current.filter((item) => item !== permission), permission]
                          : current.filter((item) => item !== permission),
                      )
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </Dialog>
    </PageBody>
  )
}
