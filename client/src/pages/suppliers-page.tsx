import { useMemo, useState } from 'react'
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
import { purchaseTotalKop } from '@/domain/calc'
import { createSupplier, updateSupplier } from '@/domain/ops'
import { formatDate, formatMoney } from '@/lib/format'
import { sortBy, sum } from '@/lib/utils'
import { useDb } from '@/store/db-store'
import { useUi } from '@/store/ui-store'
import type { Supplier } from '@/domain/types'

export function SuppliersPage() {
  const { db, apply, currentUser, has } = useDb()
  const { isMobile, toast } = useUi()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  const rows = useMemo(() => {
    const prepared = db.suppliers.map((supplier) => {
      const purchases = db.purchases.filter(
        (purchase) => purchase.supplierId === supplier.id && !purchase.cancelled,
      )
      const lastDate = purchases.length > 0 ? sortBy(purchases, (item) => item.date)[purchases.length - 1].date : null
      return {
        supplier,
        count: purchases.length,
        totalKop: sum(purchases.map((purchase) => purchaseTotalKop(purchase))),
        lastDate,
      }
    })
    return sortBy(prepared, (row) => -row.totalKop)
  }, [db])

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

  const openEdit = (supplier: Supplier) => {
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

  const submit = () => {
    if (!currentUser) return
    const payload = {
      name,
      contact: contact.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      comment: comment.trim() || undefined,
    }
    const result = editing
      ? apply((draft) => updateSupplier(draft, editing.id, payload, currentUser.id))
      : apply((draft) => createSupplier(draft, payload, currentUser.id))

    if (!result.ok) {
      setError(result.error)
      return
    }
    toast(editing ? 'Постачальника оновлено' : 'Постачальника створено', { tone: 'success' })
    setFormOpen(false)
  }

  const toggleActive = (supplier: Supplier) => {
    if (!currentUser) return
    apply((draft) => updateSupplier(draft, supplier.id, { active: !supplier.active }, currentUser.id))
    toast(supplier.active ? 'Постачальника деактивовано' : 'Постачальника активовано', { tone: 'success' })
  }

  return (
    <PageBody>
      <PageHeader
        title="Постачальники"
        description="Довідник. Видалення немає — тільки деактивація, історія закупівель зберігається."
        actions={
          has('purchases.create') ? (
            <Button size={isMobile ? 'touch' : 'default'} onClick={openCreate}>
              <Plus />
              Новий постачальник
            </Button>
          ) : null
        }
      />

      <Card>
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
                  <TableRow key={row.supplier.id}>
                    <TableCell className="font-medium">{row.supplier.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.supplier.contact ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{row.supplier.phone ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(row.totalKop)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.lastDate ? formatDate(row.lastDate) : '—'}
                    </TableCell>
                    <TableCell>
                      {row.supplier.active ? (
                        <Badge variant="outline">Активний</Badge>
                      ) : (
                        <Badge variant="secondary">Неактивний</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {has('purchases.create') ? (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(row.supplier)}>
                            Змінити
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleActive(row.supplier)}>
                            {row.supplier.active ? 'Деактивувати' : 'Активувати'}
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
            <Button onClick={submit}>{editing ? 'Зберегти' : 'Створити'}</Button>
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
