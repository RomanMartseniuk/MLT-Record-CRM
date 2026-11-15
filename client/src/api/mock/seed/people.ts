/**
 * People and equipment of the demo data: system users, RO App clients and
 * the equipment (assets) being repaired.
 */

import type { Asset, Client, User } from '@/api/contract/types'

/**
 * Demo users. `u_manager` is an executor with individual "manager" rights
 * (editing closed orders, viewing analytics), the way an administrator
 * would grant them.
 */
export const USERS: User[] = [
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

export const CLIENTS: Client[] = [
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

export const ASSETS: Asset[] = [
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
