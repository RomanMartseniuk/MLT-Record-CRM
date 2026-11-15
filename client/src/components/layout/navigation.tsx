/**
 * Primary navigation: the desktop sidebar and the mobile bottom bar.
 * Entries the user has no permission for are hidden (the server checks again).
 */

import { NavLink } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOBILE_NAV_ITEMS } from './nav'
import { useOrgName, useVisibleNav } from './nav-hooks'

export function Sidebar() {
  const items = useVisibleNav()
  const orgName = useOrgName()

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-background lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Wrench className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-4">MLT Облік</p>
          <p className="truncate text-xs text-muted-foreground">{orgName}</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto scrollbar-thin p-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                isActive ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted',
              )
            }
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3 text-xs text-muted-foreground">
        Прототип на мокових даних. Бекенд і RO App — наступні етапи.
      </div>
    </aside>
  )
}

/** The mobile bottom bar: exactly two sections for a master. */
export function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-30 flex shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      {MOBILE_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2 text-xs',
              isActive ? 'text-foreground' : 'text-muted-foreground',
            )
          }
        >
          <item.icon className="size-5" />
          <span className="font-medium">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
