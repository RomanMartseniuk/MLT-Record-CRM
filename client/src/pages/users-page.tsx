/**
 * Users page (administrators only): who can sign in and what each person may do.
 *
 * Two roles exist in the MVP. "Manager" rights are not a role: an
 * administrator grants them to each user individually on top of the executor
 * role. Users are never deleted, only blocked. The page lists the users and
 * opens the two dialogs; the permission check itself is done by the server.
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useSession, useUpdateUser, useUsers } from '@/api'
import type { User } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '@/components/ui/table'
import { InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { CreateUserDialog } from '@/components/users/create-user-dialog'
import { EditPermissionsDialog } from '@/components/users/edit-permissions-dialog'
import { PERMISSION_LABELS, ROLE_LABELS } from '@/lib/labels'
import { useSingleFlight } from '@/lib/use-single-flight'
import { useUi } from '@/store/ui-context'

export function UsersPage() {
  const { data: users, isLoading } = useUsers()
  const updateUser = useUpdateUser()
  const { user: currentUser } = useSession()
  const { isMobile, toast } = useUi()
  // One write at a time: a repeated click while a request is running is ignored.
  const { run, pending } = useSingleFlight()

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  const toggleBlocked = (user: User) =>
    run(async () => {
      const result = await updateUser.mutateAsync({ id: user.id, patch: { blocked: !user.blocked } })
      if (!result.ok) toast(result.error, { tone: 'error' })
    })

  return (
    <PageBody>
      <PageHeader
        title="Користувачі"
        description="Дві ролі в MVP. Менеджерські права видаються індивідуально поверх ролі виконавця."
        actions={
          <Button size={isMobile ? 'touch' : 'default'} onClick={() => setCreateOpen(true)}>
            <Plus />
            Новий користувач
          </Button>
        }
      />

      <Card>
        {isLoading || !users ? (
          <TableSkeleton rows={4} cols={6} />
        ) : (
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
                {users.map((user) => (
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
                        <Button variant="ghost" size="sm" onClick={() => setEditing(user)}>
                          Права
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          // You cannot block yourself: that would lock the last administrator out.
                          disabled={user.id === currentUser?.id || pending}
                          onClick={() => void toggleBlocked(user)}
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
        )}
      </Card>

      <InfoNote>
        Перевірка прав виконується на сервері. Інтерфейс лише ховає недоступні дії, але не є захистом.
      </InfoNote>

      {/* Dialogs are mounted only while open, so each one starts with a clean form. */}
      {createOpen ? <CreateUserDialog onClose={() => setCreateOpen(false)} /> : null}
      {editing ? <EditPermissionsDialog user={editing} onClose={() => setEditing(null)} /> : null}
    </PageBody>
  )
}
