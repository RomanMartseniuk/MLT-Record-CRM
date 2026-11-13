import {
  BarChart3,
  Boxes,
  History,
  LayoutDashboard,
  Plug,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  Users,
  Wrench,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { Permission } from '@/domain/types'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  permission?: Permission
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Головна', icon: LayoutDashboard },
  { to: '/orders', label: 'Заявки', icon: Wrench },
  { to: '/purchases', label: 'Закупівлі', icon: ShoppingCart, permission: 'purchases.view' },
  { to: '/inventory', label: 'Склад', icon: Boxes },
  { to: '/suppliers', label: 'Постачальники', icon: Truck, permission: 'purchases.view' },
  { to: '/categories', label: 'Категорії', icon: Tags, permission: 'purchases.view' },
  { to: '/analytics', label: 'Аналітика', icon: BarChart3, permission: 'reports.view' },
  { to: '/audit', label: 'Журнал операцій', icon: History, permission: 'reports.view' },
  { to: '/users', label: 'Користувачі', icon: Users, permission: 'users.manage' },
  { to: '/integration', label: 'Інтеграція RO App', icon: Plug, permission: 'settings.manage' },
  { to: '/settings', label: 'Налаштування', icon: Settings, permission: 'settings.manage' },
]

/** Мобільний режим майстра: строго два розділи. */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { to: '/orders', label: 'Заявки', icon: Wrench },
  { to: '/inventory', label: 'Склад і закупівлі', icon: Boxes },
]
