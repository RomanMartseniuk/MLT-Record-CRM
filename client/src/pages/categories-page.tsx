/**
 * Categories reference page: product categories with their product counts.
 * Categories are never deleted, only deactivated, so history stays intact.
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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
import { useCategories, useCreateCategory, useSession, useUpdateCategory } from '@/api'
import type { CategoryRow } from '@/api'
import { useSingleFlight } from '@/lib/use-single-flight'
import { useUi } from '@/store/ui-context'

export function CategoriesPage() {
  const { data: categories, isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const { can } = useSession()
  const { isMobile, toast } = useUi()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryRow | null>(null)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [error, setError] = useState('')

  /** Rows come sorted and with product counts from the server. */
  const rows = categories ?? []
  // One write at a time: a repeated click while a request is running is ignored.
  const { run, pending } = useSingleFlight()

  const openCreate = () => {
    setEditing(null)
    setName('')
    setParentId('')
    setError('')
    setFormOpen(true)
  }

  const openEdit = (category: CategoryRow) => {
    setEditing(category)
    setName(category.name)
    setParentId(category.parentId ?? '')
    setError('')
    setFormOpen(true)
  }

  /** Creates or updates the category; a business error is shown in the dialog. */
  const submit = () =>
    run(async () => {
      const result = editing
        ? await updateCategory.mutateAsync({ id: editing.id, patch: { name, parentId: parentId || null } })
        : await createCategory.mutateAsync({ name, kind: 'product', parentId: parentId || null })
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast(editing ? 'Категорію оновлено' : 'Категорію створено', { tone: 'success' })
      setFormOpen(false)
    })

  const toggleActive = (category: CategoryRow) =>
    run(async () => {
      const result = await updateCategory.mutateAsync({ id: category.id, patch: { active: !category.active } })
      if (!result.ok) toast(result.error, { tone: 'error' })
    })

  return (
    <PageBody>
      <PageHeader
        title="Категорії"
        description="Довідник категорій товарів. Вкладена структура підтримується."
        actions={
          can('purchases.create') ? (
            <Button size={isMobile ? 'touch' : 'default'} onClick={openCreate}>
              <Plus />
              Нова категорія
            </Button>
          ) : null
        }
      />

      <Card>
        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : (
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Назва</TableHead>
                <TableHead>Батьківська</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead className="text-right">Товарів</TableHead>
                <TableHead>Стан</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={6}>Категорій ще немає</TableEmpty>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.parentName ?? '—'}</TableCell>
                    <TableCell>
                      {row.kind === 'product' ? (
                        <Badge variant="outline">Товар</Badge>
                      ) : (
                        <Badge variant="secondary">Витрата</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.productCount}</TableCell>
                    <TableCell>
                      {row.active ? (
                        <Badge variant="outline">Активна</Badge>
                      ) : (
                        <Badge variant="secondary">Неактивна</Badge>
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
        Категорія з типом «Витрата» існує у даних як фундамент для додаткових витрат. Окремого інтерфейсу витрат
        у першій версії немає.
      </InfoNote>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Змінити категорію' : 'Нова категорія'}
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
          <Field label="Батьківська категорія" hint="Необовʼязково">
            <Select
              value={parentId}
              onValueChange={setParentId}
              placeholder="Без батьківської"
              options={rows
                .filter((item) => item.kind === 'product' && item.id !== editing?.id)
                .map((item) => ({ value: item.id, label: item.name }))}
            />
          </Field>
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Dialog>
    </PageBody>
  )
}
