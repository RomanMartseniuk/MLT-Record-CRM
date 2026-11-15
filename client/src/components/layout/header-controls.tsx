/**
 * The small controls of the top bar: global search, user menu (with the demo
 * user switcher), theme toggle and the mobile-mode toggle.
 */

import { useNavigate } from 'react-router-dom'
import { LogOut, Monitor, Moon, Search, Smartphone, Sun, User as UserIcon } from 'lucide-react'
import { useDemoUsers, useLoginAsDemo, useLogout, useSession } from '@/api'
import { Button } from '@/components/ui/button'
import { DropdownItem, DropdownLabel, DropdownMenu, DropdownSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ROLE_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { useUi } from '@/store/ui-context'

/** Search box that opens the orders list filtered by what was typed. */
export function GlobalSearch({ className }: { className?: string }) {
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

/** The signed-in user's menu: demo "sign in as another user" list and sign-out. */
export function UserMenu() {
  const { user: currentUser } = useSession()
  const { data: demoUsers = [] } = useDemoUsers()
  const loginAsDemo = useLoginAsDemo()
  const logout = useLogout()
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
          {demoUsers.map((user) => (
            <DropdownItem
              key={user.id}
              onSelect={() => {
                void loginAsDemo.mutateAsync(user.id)
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
              void logout.mutateAsync().then(() => navigate('/login'))
            }}
          >
            Вийти
          </DropdownItem>
        </>
      )}
    </DropdownMenu>
  )
}

/** Light/dark theme toggle. */
export function ThemeButton() {
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

/** Switches the desktop to the framed mobile preview and back (hidden on a narrow screen). */
export function DeviceToggle() {
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
