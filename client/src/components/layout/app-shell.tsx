import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LogOut,
  Monitor,
  Moon,
  Search,
  Smartphone,
  Sun,
  User as UserIcon,
  Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownItem, DropdownLabel, DropdownMenu, DropdownSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ROLE_LABELS } from '@/domain/permissions'
import { cn } from '@/lib/utils'
import { useDb } from '@/store/db-store'
import { useUi } from '@/store/ui-store'
import { MOBILE_NAV_ITEMS, NAV_ITEMS } from './nav'

function useVisibleNav() {
  const { has } = useDb()
  return NAV_ITEMS.filter((item) => !item.permission || has(item.permission))
}

function GlobalSearch({ className }: { className?: string }) {
  const navigate = useNavigate()

  return (
    <form
      className={cn('relative', className)}
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const query = String(data.get('q') ?? '').trim()
        navigate(query ? `/orders?q=${encodeURIComponent(query)}` : '/orders')
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input name="q" placeholder="Пошук заявки, моделі, клієнта" className="pl-9" />
    </form>
  )
}

function UserMenu() {
  const { db, currentUser, login, logout } = useDb()
  const navigate = useNavigate()

  if (!currentUser) return null

  return (
    <DropdownMenu
      trigger={
        <Button variant="outline" size="sm" className="gap-2">
          <UserIcon />
          <span className="hidden max-w-32 truncate sm:inline">{currentUser.fullName}</span>
        </Button>
      }
    >
      {(close) => (
        <>
          <DropdownLabel>
            {currentUser.fullName} · {ROLE_LABELS[currentUser.role]}
          </DropdownLabel>
          <DropdownSeparator />
          <DropdownLabel>Демо: увійти як інший користувач</DropdownLabel>
          {db.users
            .filter((user) => !user.blocked)
            .map((user) => (
              <DropdownItem
                key={user.id}
                onSelect={() => {
                  login(user.id)
                  close()
                }}
              >
                <span className={cn(user.id === currentUser.id && 'font-semibold')}>
                  {user.fullName}
                  <span className="block text-xs text-muted-foreground">
                    {ROLE_LABELS[user.role]}
                    {user.extraPermissions.length > 0 ? ' + індивідуальні права' : ''}
                  </span>
                </span>
              </DropdownItem>
            ))}
          <DropdownSeparator />
          <DropdownItem
            icon={<LogOut />}
            tone="destructive"
            onSelect={() => {
              close()
              logout()
              navigate('/login')
            }}
          >
            Вийти
          </DropdownItem>
        </>
      )}
    </DropdownMenu>
  )
}

function ThemeButton() {
  const { theme, toggleTheme } = useUi()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Світла тема' : 'Темна тема'}
      title={theme === 'dark' ? 'Світла тема' : 'Темна тема'}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}

function DeviceToggle() {
  const { forceMobile, setForceMobile, isNarrow } = useUi()
  if (isNarrow) return null
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setForceMobile(!forceMobile)}
      aria-label={forceMobile ? 'Повна версія' : 'Мобільний режим'}
      title={forceMobile ? 'Показати повну версію' : 'Показати мобільний режим майстра'}
    >
      {forceMobile ? <Monitor /> : <Smartphone />}
    </Button>
  )
}

function Sidebar() {
  const items = useVisibleNav()
  const { db } = useDb()

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-background lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Wrench className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-4">MLT Облік</p>
          <p className="truncate text-xs text-muted-foreground">{db.settings.orgName}</p>
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

function BottomNav() {
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

function MobileTopBar() {
  const { db } = useDb()
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4">
      <Link to="/orders" className="flex min-w-0 items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Wrench className="size-4" />
        </span>
        <span className="truncate text-sm font-semibold">{db.settings.orgName}</span>
      </Link>
      <div className="flex shrink-0 items-center gap-1">
        <ThemeButton />
        <DeviceToggle />
        <UserMenu />
      </div>
    </header>
  )
}

function DesktopTopBar() {
  const items = useVisibleNav()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
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

function MobileShell({ framed }: { framed: boolean }) {
  return (
    <div className={cn('flex flex-col', framed ? 'h-full' : 'min-h-dvh')}>
      <MobileTopBar />
      <main className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

function DesktopShell() {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DesktopTopBar />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function AppShell() {
  const { isMobile, showDeviceFrame } = useUi()

  if (showDeviceFrame) {
    return (
      <div className="flex min-h-dvh flex-col items-center gap-4 bg-muted p-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Smartphone className="size-4" />
          Мобільний режим майстра
          <DeviceToggle />
        </div>
        <div
          className="h-[780px] w-[390px] overflow-hidden rounded-[2rem] border-8 border-foreground/70 bg-background shadow-xl"
          style={{ transform: 'translate(0)' }}
        >
          <MobileShell framed />
        </div>
      </div>
    )
  }

  if (isMobile) return <MobileShell framed={false} />
  return <DesktopShell />
}
