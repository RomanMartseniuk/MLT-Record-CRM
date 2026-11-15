/** The top bars of the app: a compact one for mobile, a full one for desktop. */

import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownItem, DropdownMenu } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { DeviceToggle, GlobalSearch, ThemeButton, UserMenu } from './header-controls'
import { useOrgName, useVisibleNav } from './nav-hooks'

export function MobileTopBar() {
  const orgName = useOrgName()
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4">
      <Link to="/orders" className="flex min-w-0 items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Wrench className="size-4" />
        </span>
        <span className="truncate text-sm font-semibold">{orgName}</span>
      </Link>
      <div className="flex shrink-0 items-center gap-1">
        <ThemeButton />
        <DeviceToggle />
        <UserMenu />
      </div>
    </header>
  )
}

export function DesktopTopBar() {
  const items = useVisibleNav()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      {/* Below the large breakpoint the sidebar is hidden and a menu button replaces it. */}
      <div className="lg:hidden">
        <DropdownMenu
          align="start"
          className="w-56"
          trigger={
            <Button variant="outline" size="sm">
              Меню
            </Button>
          }
        >
          {(close) =>
            items.map((item) => (
              <DropdownItem
                key={item.to}
                icon={<item.icon />}
                onSelect={() => {
                  navigate(item.to)
                  close()
                }}
              >
                <span className={cn(location.pathname === item.to && 'font-semibold')}>{item.label}</span>
              </DropdownItem>
            ))
          }
        </DropdownMenu>
      </div>

      <GlobalSearch className="max-w-sm flex-1" />
      <div className="ml-auto flex items-center gap-1">
        <ThemeButton />
        <DeviceToggle />
        <UserMenu />
      </div>
    </header>
  )
}
