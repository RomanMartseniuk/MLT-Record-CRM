import { useMemo, useState } from 'react'
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
import { createCategory, updateCategory } from '@/domain/ops'
import { sortBy } from '@/lib/utils'
import { useDb } from '@/store/db-store'
import { useUi } from '@/store/ui-store'
import type { Category } from '@/domain/types'

export function CategoriesPage() {
  const { db, apply, currentUser, has } = useDb()
  const { isMobile, toast } = useUi()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [error, setError] = useState('')

  const rows = useMemo(() => {
    const prepared = db.categories.map((category) => ({
      category,
      productCount: db.products.filter((product) => product.categoryId === category.id).length,
      parent: category.parentId ? db.categories.find((item) => item.id === category.parentId) : null,
    }))
    return sortBy(prepared, (row) => `${row.category.kind}|${row.category.name}`)
  }, [db])

  const openCreate = () => {
    setEditing(null)
    setName('')
    setParentId('')
    setError('')
    setFormOpen(true)
  }

  const openEdit = (category: Category) => {
    setEditing(category)
    setName(category.name)
    setParentId(category.parentId ?? '')
    setError('')
    setFormOpen(true)
  }

  const submit = () => {
    if (!currentUser) return
    const result = editing
      ? apply((draft) =>
          updateCategory(draft, editing.id, { name, parentId: parentId || null }, currentUser.id),
        )
      : apply((draft) =>
          createCategory(draft, { name, kind: 'product', parentId: parentId || null }, currentUser.id),
        )
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast(editing ? 'Категорію оновлено' : 'Категорію створено', { tone: 'success' })
    setFormOpen(false)
  }

  const toggleActive = (category: Category) => {
    if (!currentUser) return
    apply((draft) => updateCategory(draft, category.id, { active: !category.active }, currentUser.id))
  }

  return (
    <PageBody>
      <PageHeader
        title="Категорії"
        description="Довідник категорій товарів. Вкладена структура підтримується."
        actions={
          has('purchases.create') ? (
            <Button size={isMobile ? 'touch' : 'default'} onClick={openCreate}>
              <Plus />
              Нова категорія
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
                  <TableRow key={row.category.id}>
                    <TableCell className="font-medium">{row.category.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.parent ? row.parent.name : '—'}
                    </TableCell>
                    <TableCell>
                      {row.category.kind === 'product' ? (
                        <Badge variant="outline">Товар</Badge>
                      ) : (
                        <Badge variant="secondary">Витрата</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.productCount}</TableCell>
                    <TableCell>
                      {row.category.active ? (
                        <Badge variant="outline">Активна</Badge>
                      ) : (
                        <Badge variant="secondary">Неактивна</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {has('purchases.create') ? (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(row.category)}>
                            Змінити
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleActive(row.category)}>
                            {row.category.active ? 'Деактивувати' : 'Активувати'}
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
            <Button onClick={submit}>{editing ? 'Зберегти' : 'Створити'}</Button>
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
              options={db.categories
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
