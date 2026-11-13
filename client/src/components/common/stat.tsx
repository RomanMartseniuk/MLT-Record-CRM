import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

/**
 * Показник на головній. Кожне число клікабельне й веде до своїх операцій —
 * будь-яка сума має прослідковуватись до джерела.
 */
export function Stat({
  label,
  value,
  hint,
  to,
  icon,
  className,
}: {
  label: string
  value: ReactNode
  hint?: string
  to?: string
  icon?: ReactNode
  className?: string
}) {
  const body = (
    <Card
      className={cn(
        'flex h-full flex-col gap-2 p-4 transition-colors',
        to && 'hover:border-foreground/30',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
      </div>
      <span className="text-2xl font-semibold leading-8 tabular-nums">{value}</span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {hint}
        {to ? <ArrowRight className="size-3" /> : null}
      </span>
    </Card>
  )

  if (!to) return body
  return (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  )
}

/** Невеличка плитка-заглушка замість фото товару. Без зовнішніх зображень. */
export function PhotoTile({
  tone,
  name,
  size = 'md',
}: {
  tone: number
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const initials = name
    .split(' ')
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  const sizes = {
    sm: 'size-8 text-xs rounded-sm',
    md: 'size-10 text-sm rounded-md',
    lg: 'size-16 text-base rounded-lg',
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center border border-border font-medium text-muted-foreground',
        sizes[size],
      )}
      style={{ backgroundColor: `var(--chart-${Math.min(5, Math.max(1, tone + 3))})`, opacity: 0.35 }}
    >
      {initials}
    </span>
  )
}
