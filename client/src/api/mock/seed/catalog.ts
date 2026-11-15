/**
 * The catalog of the demo data: categories, products and suppliers.
 */

import type { Category, Product, Supplier, Unit } from '@/api/contract/types'
import { uid } from '../engine/util'

export const CATEGORIES: Category[] = [
  { id: 'cat_parts', name: 'Запчастини', kind: 'product', parentId: null, active: true },
  { id: 'cat_consum', name: 'Витратні матеріали', kind: 'product', parentId: null, active: true },
  { id: 'cat_electro', name: 'Електроніка', kind: 'product', parentId: null, active: true },
  { id: 'cat_tools', name: 'Інструменти', kind: 'product', parentId: null, active: true },
  { id: 'cat_cables', name: 'Кабелі та розʼєми', kind: 'product', parentId: null, active: true },
  // An "expense" category exists in the data as the foundation for extra
  // expenses. There is no UI for extra expenses in v1.
  { id: 'cat_expense', name: 'Додаткові витрати', kind: 'expense', parentId: null, active: true },
]

interface ProductSeed {
  id: string
  name: string
  categoryId: string
  unit: Unit
  links?: { label: string; url: string }[]
}

const PRODUCT_SEEDS: ProductSeed[] = [
  { id: 'p_carb', name: 'Карбюратор Honda Dio', categoryId: 'cat_parts', unit: 'шт', links: [{ label: 'Rozetka', url: 'https://rozetka.com.ua/search/?text=карбюратор+honda+dio' }, { label: 'Мотозапчастини UA', url: 'https://example.com/carb-honda-dio' }] },
  { id: 'p_plug', name: 'Свічка запалювання NGK BPR6ES', categoryId: 'cat_parts', unit: 'шт', links: [{ label: 'Rozetka', url: 'https://rozetka.com.ua/search/?text=ngk+bpr6es' }] },
  { id: 'p_oil', name: 'Олива моторна 10W-40', categoryId: 'cat_consum', unit: 'л', links: [{ label: 'Епіцентр', url: 'https://epicentrk.ua/search/?q=олива+10w-40' }] },
  { id: 'p_airfilter', name: 'Повітряний фільтр', categoryId: 'cat_consum', unit: 'шт' },
  { id: 'p_belt', name: 'Ремінь приводу', categoryId: 'cat_parts', unit: 'шт' },
  { id: 'p_chain', name: 'Ланцюг пильний 16"', categoryId: 'cat_parts', unit: 'шт', links: [{ label: 'Епіцентр', url: 'https://epicentrk.ua/search/?q=ланцюг+пильний+16' }] },
  { id: 'p_sprocket', name: 'Зірочка ведуча', categoryId: 'cat_parts', unit: 'шт' },
  { id: 'p_pullcord', name: 'Шнур стартера', categoryId: 'cat_consum', unit: 'м' },
  { id: 'p_gasket', name: 'Прокладка циліндра', categoryId: 'cat_consum', unit: 'шт' },
  { id: 'p_piston', name: 'Поршневий комплект 44 мм', categoryId: 'cat_parts', unit: 'шт', links: [{ label: 'Дніпро-Деталь', url: 'https://example.com/piston-44' }] },
  { id: 'p_coil', name: 'Котушка запалювання', categoryId: 'cat_electro', unit: 'шт' },
  { id: 'p_regulator', name: 'Реле-регулятор напруги', categoryId: 'cat_electro', unit: 'шт' },
  { id: 'p_wire', name: 'Провід високовольтний', categoryId: 'cat_cables', unit: 'м' },
  { id: 'p_connector', name: 'Розʼєм клемний', categoryId: 'cat_cables', unit: 'шт' },
  { id: 'p_grease', name: 'Змазка графітова', categoryId: 'cat_consum', unit: 'кг' },
  { id: 'p_bearing', name: 'Підшипник 6202', categoryId: 'cat_parts', unit: 'шт' },
  { id: 'p_screwdriver', name: 'Набір викруток', categoryId: 'cat_tools', unit: 'шт' },
  { id: 'p_cleaner', name: 'Очищувач карбюратора', categoryId: 'cat_consum', unit: 'шт' },
]

/** Builds the products; the placeholder tile shade just cycles through five tones. */
export function buildProducts(): Product[] {
  return PRODUCT_SEEDS.map((seed, index) => ({
    id: seed.id,
    name: seed.name,
    categoryId: seed.categoryId,
    unit: seed.unit,
    photoTone: index % 5,
    links: (seed.links ?? []).map((link) => ({ id: uid('lnk'), label: link.label, url: link.url })),
    active: true,
  }))
}

export const SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'Мотозапчастини UA', contact: 'Віктор', phone: '+380 67 200 14 50', email: 'sales@motoparts.ua', address: 'Дніпро, вул. Робоча 112', active: true },
  { id: 's2', name: 'АвтоТехСервіс', contact: 'Сергій', phone: '+380 50 744 91 03', email: 'order@ats.com.ua', address: 'Київ, вул. Полярна 8', active: true },
  { id: 's3', name: 'Епіцентр', phone: '+380 44 585 90 90', address: 'Дніпро, пр. Слобожанський 31', comment: 'Беремо витратні матеріали на місці', active: true },
  { id: 's4', name: 'Електро-Компонент', contact: 'Ірина', phone: '+380 63 118 77 20', email: 'info@elcomp.ua', active: true },
  // An inactive supplier: no longer used, but its purchase history is kept.
  { id: 's5', name: 'Дніпро-Деталь', contact: 'Олег', phone: '+380 97 303 45 12', active: false, comment: 'Більше не працюємо, історія закупівель збережена' },
]
