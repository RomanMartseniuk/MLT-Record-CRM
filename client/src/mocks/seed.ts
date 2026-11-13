import { uid } from '@/lib/utils'
import { addAllocation, cancelPurchase, createPurchase, pushAudit } from '@/domain/ops'
import type {
  Asset,
  Category,
  Client,
  Db,
  Order,
  OrderType,
  Product,
  StatusMapping,
  Supplier,
  SyncSource,
  Unit,
  User,
} from '@/domain/types'

const DAY = 86_400_000

function daysAgo(days: number, hour = 11, minute = 20): string {
  const date = new Date(Date.now() - days * DAY)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

const USERS: User[] = [
  {
    id: 'u_admin',
    fullName: 'Роман Марценюк',
    email: 'roman@mlt.service',
    role: 'admin',
    extraPermissions: [],
    blocked: false,
    roAppName: 'Роман М.',
  },
  {
    id: 'u_master',
    fullName: 'Андрій Коваль',
    email: 'andrii@mlt.service',
    role: 'executor',
    extraPermissions: [],
    blocked: false,
    roAppName: 'Андрій К.',
  },
  {
    id: 'u_manager',
    fullName: 'Оксана Лисенко',
    email: 'oksana@mlt.service',
    role: 'executor',
    extraPermissions: ['allocations.edit_closed', 'reports.view'],
    blocked: false,
    roAppName: 'Оксана Л.',
  },
  {
    id: 'u_master2',
    fullName: 'Ігор Шевчук',
    email: 'ihor@mlt.service',
    role: 'executor',
    extraPermissions: [],
    blocked: false,
    roAppName: 'Ігор Ш.',
  },
]

const ORDER_TYPES: OrderType[] = [
  { id: 'ot_paid', name: 'Платний' },
  { id: 'ot_warranty', name: 'Гарантійний' },
  { id: 'ot_internal', name: 'Внутрішній' },
  { id: 'ot_free', name: 'Безкоштовний' },
]

/** Довідник статусів, прочитаний з RO App. «on-hold» навмисно не змаплений. */
const STATUS_MAPPINGS: StatusMapping[] = [
  { raw: 'in-queue', local: 'inQueue', label: 'В черзі' },
  { raw: 'in-progress', local: 'inWork', label: 'В роботі' },
  { raw: 'ready', local: 'done', label: 'Готово' },
  { raw: 'closed', local: 'closed', label: 'Закрито' },
]

const CLIENTS: Client[] = [
  { id: 'c1', externalId: 'ro-c-1', isOrganization: true, name: 'ТОВ «Агросервіс Плюс»', phones: ['+380 67 412 88 10'], email: 'office@agroservice.ua' },
  { id: 'c2', externalId: 'ro-c-2', isOrganization: false, name: 'Петренко Олександр', phones: ['+380 50 331 20 45'] },
  { id: 'c3', externalId: 'ro-c-3', isOrganization: true, name: 'ФОП Гнатюк І. В.', phones: ['+380 63 770 11 92'], email: 'gnatiuk@ukr.net' },
  { id: 'c4', externalId: 'ro-c-4', isOrganization: false, name: 'Сидоренко Марія', phones: ['+380 97 118 54 03', '+380 50 118 54 03'] },
  { id: 'c5', externalId: 'ro-c-5', isOrganization: true, name: 'ТОВ «Зелений двір»', phones: ['+380 44 502 73 16'], email: 'info@zelenydvir.ua' },
  { id: 'c6', externalId: 'ro-c-6', isOrganization: false, name: 'Мельник Богдан', phones: ['+380 68 904 32 77'] },
  { id: 'c7', externalId: 'ro-c-7', isOrganization: false, name: 'Ткаченко Віталій', phones: ['+380 93 615 40 28'] },
  { id: 'c8', externalId: 'ro-c-8', isOrganization: true, name: 'КП «Міськзеленбуд»', phones: ['+380 56 744 19 05'], email: 'tender@zelenbud.gov.ua' },
  { id: 'c9', externalId: 'ro-c-9', isOrganization: false, name: 'Бондаренко Наталія', phones: ['+380 66 203 85 14'] },
  { id: 'c10', externalId: 'ro-c-10', isOrganization: false, name: 'Шевченко Дмитро', phones: ['+380 99 450 67 31'] },
]

const ASSETS: Asset[] = [
  { id: 'a1', externalId: 'ro-a-1', title: 'Скутер Honda Dio AF18', type: 'Скутер', brand: 'Honda', model: 'Dio AF18', modification: '50 см³' },
  { id: 'a2', externalId: 'ro-a-2', title: 'Скутер Yamaha Jog SA36', type: 'Скутер', brand: 'Yamaha', model: 'Jog SA36' },
  { id: 'a3', externalId: 'ro-a-3', title: 'Мотопила Stihl MS 180', type: 'Мотопила', brand: 'Stihl', model: 'MS 180', modification: '16"' },
  { id: 'a4', externalId: 'ro-a-4', title: 'Мотопила Husqvarna 135', type: 'Мотопила', brand: 'Husqvarna', model: '135' },
  { id: 'a5', externalId: 'ro-a-5', title: 'Генератор Hyundai HHY 3000F', type: 'Генератор', brand: 'Hyundai', model: 'HHY 3000F' },
  { id: 'a6', externalId: 'ro-a-6', title: 'Генератор Vitals EST 2.8b', type: 'Генератор', brand: 'Vitals', model: 'EST 2.8b' },
  { id: 'a7', externalId: 'ro-a-7', title: 'Газонокосарка Bosch Rotak 34', type: 'Газонокосарка', brand: 'Bosch', model: 'Rotak 34' },
  { id: 'a8', externalId: 'ro-a-8', title: 'Газонокосарка Al-Ko Classic 3.82', type: 'Газонокосарка', brand: 'Al-Ko', model: 'Classic 3.82 SE' },
  { id: 'a9', externalId: 'ro-a-9', title: 'Тример Stihl FS 38', type: 'Тример', brand: 'Stihl', model: 'FS 38' },
  { id: 'a10', externalId: 'ro-a-10', title: 'Тример Oleo-Mac BC 241', type: 'Тример', brand: 'Oleo-Mac', model: 'BC 241 T' },
  { id: 'a11', externalId: 'ro-a-11', title: 'Мотоблок Кентавр МБ 1081Б', type: 'Мотоблок', brand: 'Кентавр', model: 'МБ 1081Б' },
  { id: 'a12', externalId: 'ro-a-12', title: 'Інвертор Dnipro-M SAB 260', type: 'Зварювальний апарат', brand: 'Dnipro-M', model: 'SAB 260' },
]

interface OrderSeed {
  id: string
  number: string
  finalStatus: string
  typeId: string
  createdDaysAgo: number
  dueInDays: number
  clientId: string
  assetId: string
  manager: string
  engineer: string
  malfunction: string
  managerNotes?: string
  engineerNotes?: string
  accessories?: string
}

const ORDER_SEEDS: OrderSeed[] = [
  { id: 'o1', number: '4201', finalStatus: 'closed', typeId: 'ot_paid', createdDaysAgo: 72, dueInDays: -64, clientId: 'c2', assetId: 'a1', manager: 'Оксана Л.', engineer: 'Андрій К.', malfunction: 'Не тримає обороти, глохне на холостому ходу', accessories: 'Ключі, чохол', engineerNotes: 'Замінено карбюратор і свічку, виставлено холостий хід' },
  { id: 'o2', number: '4202', finalStatus: 'closed', typeId: 'ot_paid', createdDaysAgo: 68, dueInDays: -58, clientId: 'c1', assetId: 'a3', manager: 'Оксана Л.', engineer: 'Ігор Ш.', malfunction: 'Ланцюг зіскакує, сильна вібрація', engineerNotes: 'Замінено ланцюг і прокладки' },
  { id: 'o3', number: '4203', finalStatus: 'ready', typeId: 'ot_warranty', createdDaysAgo: 60, dueInDays: -50, clientId: 'c4', assetId: 'a2', manager: 'Оксана Л.', engineer: 'Андрій К.', malfunction: 'Втрата потужності після 40 км/год', managerNotes: 'Гарантія до 14.08' },
  { id: 'o4', number: '4204', finalStatus: 'in-progress', typeId: 'ot_paid', createdDaysAgo: 52, dueInDays: 3, clientId: 'c5', assetId: 'a7', manager: 'Оксана Л.', engineer: 'Андрій К.', malfunction: 'Не запускається, обрив шнура стартера', accessories: 'Ніж, кошик для трави' },
  { id: 'o5', number: '4205', finalStatus: 'in-progress', typeId: 'ot_paid', createdDaysAgo: 47, dueInDays: 2, clientId: 'c3', assetId: 'a4', manager: 'Оксана Л.', engineer: 'Ігор Ш.', malfunction: 'Димить, падає потужність під навантаженням' },
  { id: 'o6', number: '4206', finalStatus: 'in-progress', typeId: 'ot_paid', createdDaysAgo: 40, dueInDays: 1, clientId: 'c6', assetId: 'a1', manager: 'Оксана Л.', engineer: 'Андрій К.', malfunction: 'Переливає паливо, чорний нагар на свічці' },
  { id: 'o7', number: '4207', finalStatus: 'in-queue', typeId: 'ot_free', createdDaysAgo: 34, dueInDays: 5, clientId: 'c7', assetId: 'a9', manager: 'Оксана Л.', engineer: 'Ігор Ш.', malfunction: 'Діагностика після падіння' },
  { id: 'o8', number: '4208', finalStatus: 'in-queue', typeId: 'ot_paid', createdDaysAgo: 31, dueInDays: 6, clientId: 'c8', assetId: 'a8', manager: 'Оксана Л.', engineer: 'Андрій К.', malfunction: 'Не вмикається, пошкоджений кабель живлення' },
  { id: 'o9', number: '4209', finalStatus: 'in-progress', typeId: 'ot_paid', createdDaysAgo: 29, dueInDays: 2, clientId: 'c1', assetId: 'a5', manager: 'Оксана Л.', engineer: 'Ігор Ш.', malfunction: 'Немає іскри, не заводиться', managerNotes: 'Клієнт просить зателефонувати перед ремонтом' },
  { id: 'o10', number: '4210', finalStatus: 'in-queue', typeId: 'ot_internal', createdDaysAgo: 26, dueInDays: 9, clientId: 'c5', assetId: 'a12', manager: 'Роман М.', engineer: 'Андрій К.', malfunction: 'Планове обслуговування власного обладнання' },
  { id: 'o11', number: '4211', finalStatus: 'in-progress', typeId: 'ot_paid', createdDaysAgo: 23, dueInDays: 1, clientId: 'c9', assetId: 'a1', manager: 'Оксана Л.', engineer: 'Андрій К.', malfunction: 'Не тримає обороти, слабка іскра' },
  { id: 'o12', number: '4212', finalStatus: 'ready', typeId: 'ot_paid', createdDaysAgo: 21, dueInDays: -2, clientId: 'c10', assetId: 'a11', manager: 'Оксана Л.', engineer: 'Ігор Ш.', malfunction: 'Стук у двигуні, втрата компресії', engineerNotes: 'Замінено поршневий комплект і підшипники' },
  { id: 'o13', number: '4213', finalStatus: 'in-queue', typeId: 'ot_paid', createdDaysAgo: 15, dueInDays: 4, clientId: 'c3', assetId: 'a6', manager: 'Оксана Л.', engineer: 'Андрій К.', malfunction: 'Потрібна заміна оливи та фільтрів' },
  { id: 'o14', number: '4214', finalStatus: 'in-progress', typeId: 'ot_paid', createdDaysAgo: 16, dueInDays: 1, clientId: 'c2', assetId: 'a10', manager: 'Оксана Л.', engineer: 'Ігор Ш.', malfunction: 'Пропадає іскра на гарячому двигуні' },
  { id: 'o15', number: '4215', finalStatus: 'on-hold', typeId: 'ot_warranty', createdDaysAgo: 11, dueInDays: 8, clientId: 'c4', assetId: 'a4', manager: 'Оксана Л.', engineer: 'Андрій К.', malfunction: 'Очікуємо рішення виробника по гарантії', managerNotes: 'Статус із RO App поки не змаплений локально' },
  { id: 'o16', number: '4216', finalStatus: 'in-queue', typeId: 'ot_paid', createdDaysAgo: 6, dueInDays: 7, clientId: 'c7', assetId: 'a12', manager: 'Оксана Л.', engineer: 'Ігор Ш.', malfunction: 'Обрив у клемній колодці' },
]

const CATEGORIES: Category[] = [
  { id: 'cat_parts', name: 'Запчастини', kind: 'product', parentId: null, active: true },
  { id: 'cat_consum', name: 'Витратні матеріали', kind: 'product', parentId: null, active: true },
  { id: 'cat_electro', name: 'Електроніка', kind: 'product', parentId: null, active: true },
  { id: 'cat_tools', name: 'Інструменти', kind: 'product', parentId: null, active: true },
  { id: 'cat_cables', name: 'Кабелі та розʼєми', kind: 'product', parentId: null, active: true },
  // Категорія витрат існує у даних як фундамент. UI для додаткових витрат у v1 немає.
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

const SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'Мотозапчастини UA', contact: 'Віктор', phone: '+380 67 200 14 50', email: 'sales@motoparts.ua', address: 'Дніпро, вул. Робоча 112', active: true },
  { id: 's2', name: 'АвтоТехСервіс', contact: 'Сергій', phone: '+380 50 744 91 03', email: 'order@ats.com.ua', address: 'Київ, вул. Полярна 8', active: true },
  { id: 's3', name: 'Епіцентр', phone: '+380 44 585 90 90', address: 'Дніпро, пр. Слобожанський 31', comment: 'Беремо витратні матеріали на місці', active: true },
  { id: 's4', name: 'Електро-Компонент', contact: 'Ірина', phone: '+380 63 118 77 20', email: 'info@elcomp.ua', active: true },
  { id: 's5', name: 'Дніпро-Деталь', contact: 'Олег', phone: '+380 97 303 45 12', active: false, comment: 'Більше не працюємо, історія закупівель збережена' },
]

function createBaseDb(): Db {
  const orders: Order[] = ORDER_SEEDS.map((seed) => ({
    id: seed.id,
    externalId: `ro-o-${seed.number}`,
    number: seed.number,
    // Під час наповнення всі заявки відкриті, фінальні статуси застосуємо потім.
    rawStatus: 'in-progress',
    typeId: seed.typeId,
    createdAt: daysAgo(seed.createdDaysAgo, 9, 15),
    dueDate: daysAgo(-seed.dueInDays, 18, 0),
    clientId: seed.clientId,
    assetId: seed.assetId,
    managerName: seed.manager,
    engineerName: seed.engineer,
    malfunction: seed.malfunction,
    managerNotes: seed.managerNotes,
    engineerNotes: seed.engineerNotes,
    accessories: seed.accessories,
    syncedAt: daysAgo(0, 3, 0),
  }))

  const products: Product[] = PRODUCT_SEEDS.map((seed, index) => ({
    id: seed.id,
    name: seed.name,
    categoryId: seed.categoryId,
    unit: seed.unit,
    photoTone: index % 5,
    links: (seed.links ?? []).map((link) => ({ id: uid('lnk'), label: link.label, url: link.url })),
    active: true,
  }))

  return {
    users: USERS.map((user) => ({ ...user })),
    orderTypes: ORDER_TYPES.map((type) => ({ ...type })),
    statusMappings: STATUS_MAPPINGS.map((mapping) => ({ ...mapping })),
    clients: CLIENTS.map((client) => ({ ...client })),
    assets: ASSETS.map((asset) => ({ ...asset })),
    orders,
    categories: CATEGORIES.map((category) => ({ ...category })),
    products,
    suppliers: SUPPLIERS.map((supplier) => ({ ...supplier })),
    purchases: [],
    batches: [],
    allocations: [],
    audit: [],
    syncLog: [],
    settings: {
      orgName: 'MLT Service',
      currency: 'UAH',
      timeZone: 'Europe/Kyiv',
      dateFormat: 'ДД.ММ.РРРР',
      nightlySyncTime: '03:00',
      webhookUrl: 'https://oblik.mlt.service/api/roapp/webhook',
      webhookEnabled: true,
    },
    lastSyncAt: daysAgo(0, 3, 0),
    counters: { purchase: 0 },
  }
}

interface PurchaseEvent {
  kind: 'purchase'
  day: number
  supplierId: string
  destination: 'warehouse' | 'order'
  orderId?: string
  docNumber?: string
  hasReceipt?: boolean
  comment?: string
  userId: string
  items: { productId: string; qty: number; price: number }[]
  cancelAfter?: string
}

interface AllocationEvent {
  kind: 'allocation'
  day: number
  orderId: string
  productId: string
  qty: number
  userId: string
}

type SeedEvent = PurchaseEvent | AllocationEvent

/** Сценарій у хронологічному порядку: закупівлі та вкладення. */
const TIMELINE: SeedEvent[] = [
  { kind: 'purchase', day: 70, supplierId: 's1', destination: 'warehouse', docNumber: 'НК-10244', hasReceipt: true, userId: 'u_admin', items: [
    { productId: 'p_carb', qty: 4, price: 115000 },
    { productId: 'p_plug', qty: 20, price: 9500 },
    { productId: 'p_oil', qty: 10, price: 32000 },
  ] },
  { kind: 'allocation', day: 66, orderId: 'o1', productId: 'p_carb', qty: 1, userId: 'u_master' },
  { kind: 'allocation', day: 65, orderId: 'o1', productId: 'p_plug', qty: 2, userId: 'u_master' },
  { kind: 'allocation', day: 64, orderId: 'o1', productId: 'p_oil', qty: 0.8, userId: 'u_master' },
  { kind: 'purchase', day: 62, supplierId: 's2', destination: 'warehouse', docNumber: 'НК-10301', hasReceipt: true, userId: 'u_admin', items: [
    { productId: 'p_chain', qty: 6, price: 48000 },
    { productId: 'p_sprocket', qty: 4, price: 26000 },
    { productId: 'p_gasket', qty: 12, price: 5500 },
  ] },
  { kind: 'allocation', day: 60, orderId: 'o2', productId: 'p_chain', qty: 1, userId: 'u_master2' },
  { kind: 'allocation', day: 58, orderId: 'o2', productId: 'p_gasket', qty: 2, userId: 'u_master2' },
  { kind: 'allocation', day: 55, orderId: 'o3', productId: 'p_carb', qty: 1, userId: 'u_master' },
  { kind: 'allocation', day: 52, orderId: 'o3', productId: 'p_sprocket', qty: 1, userId: 'u_master' },
  { kind: 'purchase', day: 50, supplierId: 's3', destination: 'warehouse', hasReceipt: true, comment: 'Витратні матеріали на місяць', userId: 'u_master', items: [
    { productId: 'p_airfilter', qty: 8, price: 18000 },
    { productId: 'p_cleaner', qty: 6, price: 14500 },
    { productId: 'p_grease', qty: 3, price: 21000 },
  ] },
  { kind: 'allocation', day: 48, orderId: 'o4', productId: 'p_airfilter', qty: 1, userId: 'u_master' },
  { kind: 'allocation', day: 45, orderId: 'o5', productId: 'p_chain', qty: 1, userId: 'u_master2' },
  { kind: 'allocation', day: 44, orderId: 'o5', productId: 'p_cleaner', qty: 1, userId: 'u_master2' },
  { kind: 'purchase', day: 41, supplierId: 's1', destination: 'warehouse', docNumber: 'НК-10488', hasReceipt: true, comment: 'Ціна піднялася порівняно з попередньою партією', userId: 'u_admin', items: [
    { productId: 'p_carb', qty: 3, price: 129000 },
    { productId: 'p_belt', qty: 5, price: 33000 },
  ] },
  { kind: 'allocation', day: 38, orderId: 'o6', productId: 'p_carb', qty: 2, userId: 'u_master' },
  { kind: 'allocation', day: 36, orderId: 'o6', productId: 'p_belt', qty: 1, userId: 'u_master' },
  { kind: 'purchase', day: 33, supplierId: 's4', destination: 'warehouse', docNumber: 'EC-7781', userId: 'u_admin', items: [
    { productId: 'p_coil', qty: 3, price: 86000 },
    { productId: 'p_regulator', qty: 2, price: 54000 },
    { productId: 'p_wire', qty: 10, price: 4800 },
  ] },
  { kind: 'allocation', day: 30, orderId: 'o9', productId: 'p_oil', qty: 1.5, userId: 'u_master2' },
  { kind: 'allocation', day: 28, orderId: 'o11', productId: 'p_carb', qty: 2, userId: 'u_master' },
  { kind: 'allocation', day: 26, orderId: 'o11', productId: 'p_coil', qty: 1, userId: 'u_master' },
  { kind: 'purchase', day: 24, supplierId: 's5', destination: 'warehouse', docNumber: 'ДД-2210', hasReceipt: true, userId: 'u_admin', items: [
    { productId: 'p_piston', qty: 2, price: 168000 },
    { productId: 'p_bearing', qty: 10, price: 8500 },
    { productId: 'p_connector', qty: 30, price: 1200 },
  ] },
  { kind: 'allocation', day: 22, orderId: 'o12', productId: 'p_piston', qty: 1, userId: 'u_master2' },
  { kind: 'allocation', day: 20, orderId: 'o12', productId: 'p_bearing', qty: 2, userId: 'u_master2' },
  { kind: 'allocation', day: 19, orderId: 'o12', productId: 'p_sprocket', qty: 3, userId: 'u_master2' },
  { kind: 'purchase', day: 17, supplierId: 's1', destination: 'order', orderId: 'o4', comment: 'Куплено під конкретний ремонт, на склад не заводимо', hasReceipt: true, userId: 'u_master', items: [
    { productId: 'p_pullcord', qty: 3, price: 6000 },
  ] },
  { kind: 'allocation', day: 16, orderId: 'o4', productId: 'p_gasket', qty: 1, userId: 'u_master' },
  { kind: 'allocation', day: 14, orderId: 'o14', productId: 'p_oil', qty: 2.5, userId: 'u_master2' },
  { kind: 'purchase', day: 12, supplierId: 's2', destination: 'warehouse', docNumber: 'НК-10902', hasReceipt: true, userId: 'u_admin', items: [
    { productId: 'p_oil', qty: 12, price: 34500 },
    { productId: 'p_plug', qty: 15, price: 10200 },
  ] },
  { kind: 'allocation', day: 10, orderId: 'o14', productId: 'p_wire', qty: 3, userId: 'u_master2' },
  { kind: 'purchase', day: 9, supplierId: 's5', destination: 'warehouse', docNumber: 'ДД-2301', userId: 'u_admin', items: [
    { productId: 'p_bearing', qty: 5, price: 9000 },
  ], cancelAfter: 'Постачальник не підтвердив наявність, замовлення скасоване' },
  { kind: 'purchase', day: 8, supplierId: 's3', destination: 'warehouse', hasReceipt: true, userId: 'u_master', items: [
    { productId: 'p_screwdriver', qty: 1, price: 125000 },
    { productId: 'p_cleaner', qty: 4, price: 15800 },
  ] },
  { kind: 'allocation', day: 7, orderId: 'o5', productId: 'p_plug', qty: 3, userId: 'u_master2' },
  { kind: 'allocation', day: 6, orderId: 'o16', productId: 'p_connector', qty: 4, userId: 'u_master2' },
  { kind: 'purchase', day: 4, supplierId: 's4', destination: 'order', orderId: 'o9', docNumber: 'EC-8044', userId: 'u_master2', items: [
    { productId: 'p_coil', qty: 1, price: 91000 },
  ] },
  { kind: 'allocation', day: 3, orderId: 'o9', productId: 'p_cleaner', qty: 2, userId: 'u_master2' },
  { kind: 'allocation', day: 2, orderId: 'o11', productId: 'p_oil', qty: 4, userId: 'u_master' },
  { kind: 'allocation', day: 1, orderId: 'o6', productId: 'p_carb', qty: 1, userId: 'u_master' },
  // Перекриває дві партії оливи: 1.2 л за старою ціною і решта за новою.
  { kind: 'allocation', day: 0, orderId: 'o13', productId: 'p_oil', qty: 3, userId: 'u_master' },
]

const SYNC_SEED: { day: number; hour: number; source: SyncSource; ok: boolean; added: number; updated: number; message: string }[] = [
  { day: 0, hour: 3, source: 'nightly', ok: true, added: 0, updated: 16, message: 'Нічне оновлення: заявки, клієнти, техніка, довідники.' },
  { day: 0, hour: 9, source: 'webhook', ok: true, added: 0, updated: 1, message: 'Заявка 4216: створено в RO App.' },
  { day: 1, hour: 3, source: 'nightly', ok: true, added: 1, updated: 15, message: 'Нічне оновлення: додано 1 заявку.' },
  { day: 1, hour: 14, source: 'manual', ok: true, added: 0, updated: 16, message: 'Глобальне оновлення, запущене адміністратором.' },
  { day: 2, hour: 3, source: 'nightly', ok: false, added: 0, updated: 0, message: 'RO App недоступний: таймаут зʼєднання. Система продовжила працювати на вже завантажених даних.' },
  { day: 2, hour: 11, source: 'webhook', ok: true, added: 0, updated: 1, message: 'Заявка 4214: статус змінено на «in-progress».' },
]

function applyFinalStatuses(db: Db): void {
  for (const seed of ORDER_SEEDS) {
    const order = db.orders.find((item) => item.id === seed.id)
    if (!order) continue
    order.rawStatus = seed.finalStatus
    if (seed.finalStatus === 'ready' || seed.finalStatus === 'closed') {
      order.doneAt = daysAgo(Math.max(1, seed.createdDaysAgo - 12), 16, 30)
    }
    if (seed.finalStatus === 'closed') {
      order.closedAt = daysAgo(Math.max(1, seed.createdDaysAgo - 10), 17, 10)
    }
  }
}

/** Повністю заповнена база. Операції виконуються тими самими функціями, що і в UI. */
export function createSeededDb(): Db {
  const db = createBaseDb()

  for (const event of TIMELINE) {
    if (event.kind === 'purchase') {
      const result = createPurchase(
        db,
        {
          date: daysAgo(event.day, 10, 40),
          supplierId: event.supplierId,
          docNumber: event.docNumber,
          comment: event.comment,
          hasReceipt: event.hasReceipt,
          destination: event.destination,
          orderId: event.orderId,
          items: event.items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            unitPriceKop: item.price,
          })),
        },
        event.userId,
      )
      if (result.ok && event.cancelAfter) {
        cancelPurchase(db, result.value.purchaseId, event.cancelAfter, 'u_admin')
      }
    } else {
      addAllocation(
        db,
        {
          orderId: event.orderId,
          productId: event.productId,
          qty: event.qty,
          at: daysAgo(event.day, 15, 10),
        },
        event.userId,
      )
    }
  }

  applyFinalStatuses(db)

  for (const entry of SYNC_SEED) {
    db.syncLog.push({
      id: uid('syn'),
      at: daysAgo(entry.day, entry.hour, 5),
      source: entry.source,
      ok: entry.ok,
      added: entry.added,
      updated: entry.updated,
      message: entry.message,
    })
  }
  db.syncLog.sort((a, b) => (a.at < b.at ? 1 : -1))

  pushAudit(
    db,
    {
      userId: 'u_admin',
      action: 'integration.sync',
      objectType: 'RO App',
      objectId: 'integration',
      objectLabel: 'Первинне завантаження',
      after: `завантажено ${db.orders.length} заявок, ${db.clients.length} клієнтів, ${db.assets.length} од. техніки`,
    },
    daysAgo(73, 8, 0),
  )

  db.audit.sort((a, b) => (a.at < b.at ? 1 : -1))

  return db
}
