/**
 * The frame around every signed-in page: navigation, top bar and the page
 * itself (`<Outlet />`).
 *
 * Three layouts: the desktop shell (sidebar + top bar), the mobile shell
 * (compact top bar + bottom navigation) used on a narrow screen, and the
 * same mobile shell shown inside a phone frame on a laptop for demos.
 */

import { Outlet } from 'react-router-dom'
import { Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUi } from '@/store/ui-context'
import { DeviceToggle } from './header-controls'
import { BottomNav, Sidebar } from './navigation'
import { DesktopTopBar, MobileTopBar } from './top-bars'

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

  // Mobile preview on a laptop: the mobile shell inside a 390px phone frame.
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
