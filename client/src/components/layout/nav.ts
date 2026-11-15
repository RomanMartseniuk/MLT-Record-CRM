/**
 * The navigation map of the app.
 *
 * `NAV_ITEMS` is the full desktop navigation; an item with a `permission` is
 * shown only to users who have it. `MOBILE_NAV_ITEMS` is the master's mobile
 * mode: exactly two sections.
 */

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
import type { Permission } from '@/api'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  /** Permission needed to see the item; none means everyone. */
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

/** The master's mobile mode: strictly two sections. */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { to: '/orders', label: 'Заявки', icon: Wrench },
  { to: '/inventory', label: 'Склад і закупівлі', icon: Boxes },
]
