/**
 * Dialog that creates a new product in the reference list.
 * Creating a product does not change any stock: the stock appears after a purchase.
 */

import { useState } from 'react'
import { useCategories, useCreateProduct } from '@/api'
import type { Product, Unit } from '@/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ErrorNote, InfoNote } from '@/components/common/page'
import { useSingleFlight } from '@/lib/use-single-flight'
import { useUi } from '@/store/ui-context'

const UNITS: Unit[] = ['шт', 'л', 'кг', 'м']

/**
 * Mount it only while it is open: the form state starts fresh on every mount.
 *
 * `onCreated` is for callers that want to use the new product right away
 * (the new purchase form selects it in the row that asked for it).
 */
export function NewProductDialog({
  onClose,
  onCreated,
  title = 'Новий товар',
}: {
  onClose: () => void
  onCreated?: (product: Product) => void
  title?: string
}) {
  const { data: categories = [] } = useCategories()
  const createProduct = useCreateProduct()
  const { toast } = useUi()
  const { run, pending } = useSingleFlight()

  const productCategories = categories.filter((item) => item.kind === 'product' && item.active)

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [unit, setUnit] = useState<Unit>('шт')
  const [error, setError] = useState('')

  // Until the user picks one, the first active product category is preselected.
  const selectedCategory = categoryId || productCategories[0]?.id || ''

  const submit = () =>
    run(async () => {
      const result = await createProduct.mutateAsync({ name, categoryId: selectedCategory, unit, links: [] })
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast('Товар створено', {
        description: onCreated
          ? `${result.value.name} додано в довідник.`
          : 'Тепер оформіть закупівлю, щоб зʼявився залишок.',
        tone: 'success',
      })
      onCreated?.(result.value)
      onClose()
    })

  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
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
        <Field label="Назва">
          <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Категорія">
          <Select
            value={selectedCategory}
            onValueChange={setCategoryId}
            options={productCategories.map((item) => ({ value: item.id, label: item.name }))}
          />
        </Field>
        <Field label="Одиниця">
          <Select
            value={unit}
            onValueChange={(value) => setUnit(value as Unit)}
            options={UNITS.map((item) => ({ value: item, label: item }))}
          />
        </Field>
        <InfoNote>Залишок зʼявиться після закупівлі. Створення товару сам залишок не змінює.</InfoNote>
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Dialog>
  )
}
