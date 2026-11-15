/**
 * Suppliers reference page with purchase totals. Suppliers are never deleted,
 * only deactivated, so their purchase history is kept.
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableWrap,
} from '@/components/ui/table'
import { ErrorNote, InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useCreateSupplier, useSession, useSuppliers, useUpdateSupplier } from '@/api'
import type { SupplierRow } from '@/api'
import { formatDate, formatMoney } from '@/lib/format'
import { useSingleFlight } from '@/lib/use-single-flight'
import { useUi } from '@/store/ui-context'

export function SuppliersPage() {
  const { data: suppliers, isLoading } = useSuppliers()
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()
  const { can } = useSession()
  const { isMobile, toast } = useUi()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SupplierRow | null>(null)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  /** Rows come sorted (biggest total first) and with purchase totals from the server. */
  const rows = suppliers ?? []
  // One write at a time: a repeated click while a request is running is ignored.
  const { run, pending } = useSingleFlight()

  const openCreate = () => {
    setEditing(null)
    setName('')
    setContact('')
    setPhone('')
    setEmail('')
    setAddress('')
    setComment('')
    setError('')
    setFormOpen(true)
  }

  const openEdit = (supplier: SupplierRow) => {
    setEditing(supplier)
    setName(supplier.name)
    setContact(supplier.contact ?? '')
    setPhone(supplier.phone ?? '')
    setEmail(supplier.email ?? '')
    setAddress(supplier.address ?? '')
    setComment(supplier.comment ?? '')
    setError('')
    setFormOpen(true)
  }

  /** Creates or updates the supplier; a business error is shown in the dialog. */
  const submit = () =>
    run(async () => {
      const payload = {
        name,
        contact: contact.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        comment: comment.trim() || undefined,
      }
      const result = editing
        ? await updateSupplier.mutateAsync({ id: editing.id, patch: payload })
        : await createSupplier.mutateAsync(payload)

      if (!result.ok) {
        setError(result.error)
        return
      }
      toast(editing ? 'Постачальника оновлено' : 'Постачальника створено', { tone: 'success' })
      setFormOpen(false)
    })

  const toggleActive = (supplier: SupplierRow) =>
    run(async () => {
      const result = await updateSupplier.mutateAsync({ id: supplier.id, patch: { active: !supplier.active } })
      if (!result.ok) {
        toast(result.error, { tone: 'error' })
        return
      }
      toast(supplier.active ? 'Постачальника деактивовано' : 'Постачальника активовано', { tone: 'success' })
    })

  return (
    <PageBody>
      <PageHeader
        title="Постачальники"
        description="Довідник. Видалення немає — тільки деактивація, історія закупівель зберігається."
        actions={
          can('purchases.create') ? (
            <Button size={isMobile ? 'touch' : 'default'} onClick={openCreate}>
              <Plus />
              Новий постачальник
            </Button>
          ) : null
        }
      />

      <Card>
        {isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : (
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Назва</TableHead>
                <TableHead>Контакт</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead className="text-right">Закупівель</TableHead>
                <TableHead className="text-right">Сума</TableHead>
                <TableHead>Остання</TableHead>
                <TableHead>Стан</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={8}>Постачальників ще немає</TableEmpty>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.contact ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{row.phone ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.purchasesCount}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(row.purchasesTotalKop)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.lastPurchaseDate ? formatDate(row.lastPurchaseDate) : '—'}
                    </TableCell>
                    <TableCell>
                      {row.active ? (
                        <Badge variant="outline">Активний</Badge>
                      ) : (
                        <Badge variant="secondary">Неактивний</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {can('purchases.create') ? (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                            Змінити
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={pending}
                            onClick={() => void toggleActive(row)}
                          >
                            {row.active ? 'Деактивувати' : 'Активувати'}
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableWrap>
        )}
      </Card>

      <InfoNote>
        Якщо на постачальника є закупівлі, його деактивація не прибирає історичні дані.
      </InfoNote>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Змінити постачальника' : 'Новий постачальник'}
        width="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={() => void submit()} disabled={pending}>
              {editing ? 'Зберегти' : 'Створити'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Назва">
            <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Контактна особа" hint="Необовʼязково">
              <Input value={contact} onChange={(event) => setContact(event.target.value)} />
            </Field>
            <Field label="Телефон" hint="Необовʼязково">
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </Field>
          </div>
          <Field label="Пошта" hint="Необовʼязково">
            <Input value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Адреса" hint="Необовʼязково">
            <Input value={address} onChange={(event) => setAddress(event.target.value)} />
          </Field>
          <Field label="Коментар" hint="Необовʼязково">
            <Textarea value={comment} onChange={(event) => setComment(event.target.value)} />
          </Field>
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Dialog>
    </PageBody>
  )
}
