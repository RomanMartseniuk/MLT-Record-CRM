import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Inbox, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface Crumb {
  label: string
  to?: string
}

export function PageHeader({
  title,
  description,
  crumbs,
  actions,
}: {
  title: string
  description?: string
  crumbs?: Crumb[]
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      {crumbs && crumbs.length > 0 ? (
        <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Навігація">
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="size-3" /> : null}
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold leading-8">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-4', className)}>{children}</div>
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
      <span className="text-muted-foreground [&_svg]:size-6">{icon ?? <Inbox />}</span>
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="max-w-md text-xs text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function NoAccess({ what }: { what?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-10 text-center">
      <Lock className="size-6 text-muted-foreground" />
      <p className="text-sm font-medium">Немає доступу</p>
      <p className="max-w-md text-xs text-muted-foreground">
        {what ?? 'У вас немає прав на цей розділ.'} Зверніться до адміністратора, щоб він видав потрібне право.
      </p>
      <Link to="/" className="mt-2">
        <Button variant="outline" size="sm">
          На головну
        </Button>
      </Link>
    </div>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive">
      {children}
    </p>
  )
}

export function InfoNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground', className)}>
      {children}
    </p>
  )
}
