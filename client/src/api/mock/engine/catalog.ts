/**
 * Довідники: товари, постачальники, категорії.
 *
 * Довідники ніколи не видаляються: постачальника й категорію можна лише
 * деактивувати, щоб історія закупівель і вкладень лишалася цілою.
 * Кожна зміна довідника пишеться в журнал із станом «до» і «після».
 */

import type {
  CategoryInput,
  CategoryPatch,
  ProductInput,
  ProductPatch,
  SupplierInput,
  SupplierPatch,
} from '@/api/contract/dto'
import type { ApiResult } from '@/api/contract/result'
import type { Category, Product, Supplier } from '@/api/contract/types'
import { pushAudit } from './audit'
import { fail, ok } from './result'
import type { Db } from './types'
import { uid } from './util'

/* ─── Товари ───────────────────────────────────────────────────────── */

/**
 * Створює товар. Назва обов'язкова й унікальна без урахування регістру.
 * Залишків товар не зберігає: вони рахуються з партій.
 */
export function createProduct(db: Db, input: ProductInput, userId: string): ApiResult<Product> {
  const name = input.name.trim()
  if (!name) return fail('Вкажіть назву товару.')
  if (!input.categoryId) return fail('Виберіть категорію.')

  const exists = db.products.some((item) => item.name.toLowerCase() === name.toLowerCase())
  if (exists) return fail('Товар з такою назвою вже є на складі.')

  const product: Product = {
    id: uid('prd'),
    name,
    categoryId: input.categoryId,
    unit: input.unit,
    // Замість фото в прототипі показується нейтральна плитка одного з п'яти відтінків.
    photoTone: db.products.length % 5,
    links: input.links,
    active: true,
  }
  db.products.push(product)

  pushAudit(db, {
    userId,
    action: 'product.create',
    objectType: 'Товар',
    objectId: product.id,
    objectLabel: product.name,
    after: 'створено',
  })

  return ok(product)
}

/** Змінює поля товару (назву, категорію, одиницю, посилання на магазини). */
export function updateProduct(db: Db, productId: string, patch: ProductPatch, userId: string): ApiResult {
  const product = db.products.find((item) => item.id === productId)
  if (!product) return fail('Товар не знайдено.')

  const before = `${product.name}, ${product.links.length} поси.`
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) return fail('Назва не може бути порожньою.')
    product.name = name
  }
  if (patch.categoryId !== undefined) product.categoryId = patch.categoryId
  if (patch.unit !== undefined) product.unit = patch.unit
  if (patch.links !== undefined) product.links = patch.links

  pushAudit(db, {
    userId,
    action: 'product.update',
    objectType: 'Товар',
    objectId: product.id,
    objectLabel: product.name,
    before,
    after: `${product.name}, ${product.links.length} поси.`,
  })

  return ok(undefined)
}

/* ─── Постачальники ────────────────────────────────────────────────── */

/** Створює активного постачальника. */
export function createSupplier(db: Db, input: SupplierInput, userId: string): ApiResult<Supplier> {
  const name = input.name.trim()
  if (!name) return fail('Вкажіть назву постачальника.')

  const supplier: Supplier = {
    id: uid('sup'),
    name,
    contact: input.contact,
    phone: input.phone,
    email: input.email,
    address: input.address,
    comment: input.comment,
    active: true,
  }
  db.suppliers.push(supplier)

  pushAudit(db, {
    userId,
    action: 'supplier.create',
    objectType: 'Постачальник',
    objectId: supplier.id,
    objectLabel: supplier.name,
    after: 'створено',
  })

  return ok(supplier)
}

/** Змінює постачальника; `active: false` деактивує його без видалення. */
export function updateSupplier(db: Db, supplierId: string, patch: SupplierPatch, userId: string): ApiResult {
  const supplier = db.suppliers.find((item) => item.id === supplierId)
  if (!supplier) return fail('Постачальника не знайдено.')

  const before = supplier.active ? 'активний' : 'неактивний'
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) return fail('Назва не може бути порожньою.')
    supplier.name = name
  }
  if (patch.contact !== undefined) supplier.contact = patch.contact
  if (patch.phone !== undefined) supplier.phone = patch.phone
  if (patch.email !== undefined) supplier.email = patch.email
  if (patch.address !== undefined) supplier.address = patch.address
  if (patch.comment !== undefined) supplier.comment = patch.comment
  if (patch.active !== undefined) supplier.active = patch.active

  pushAudit(db, {
    userId,
    action: 'supplier.update',
    objectType: 'Постачальник',
    objectId: supplier.id,
    objectLabel: supplier.name,
    before,
    after: supplier.active ? 'активний' : 'неактивний',
  })

  return ok(undefined)
}

/* ─── Категорії ────────────────────────────────────────────────────── */

/** Створює категорію (товару або витрати). */
export function createCategory(db: Db, input: CategoryInput, userId: string): ApiResult<Category> {
  const name = input.name.trim()
  if (!name) return fail('Вкажіть назву категорії.')

  const category: Category = {
    id: uid('cat'),
    name,
    kind: input.kind,
    parentId: input.parentId,
    active: true,
  }
  db.categories.push(category)

  pushAudit(db, {
    userId,
    action: 'category.create',
    objectType: 'Категорія',
    objectId: category.id,
    objectLabel: category.name,
    after: 'створено',
  })

  return ok(category)
}

/** Змінює категорію; `active: false` деактивує її без видалення. */
export function updateCategory(db: Db, categoryId: string, patch: CategoryPatch, userId: string): ApiResult {
  const category = db.categories.find((item) => item.id === categoryId)
  if (!category) return fail('Категорію не знайдено.')

  const before = `${category.name}, ${category.active ? 'активна' : 'неактивна'}`
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) return fail('Назва не може бути порожньою.')
    category.name = name
  }
  if (patch.parentId !== undefined) category.parentId = patch.parentId
  if (patch.active !== undefined) category.active = patch.active

  pushAudit(db, {
    userId,
    action: 'category.update',
    objectType: 'Категорія',
    objectId: category.id,
    objectLabel: category.name,
    before,
    after: `${category.name}, ${category.active ? 'активна' : 'неактивна'}`,
  })

  return ok(undefined)
}
