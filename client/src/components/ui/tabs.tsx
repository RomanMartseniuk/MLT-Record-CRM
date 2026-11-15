/**
 * A simple tab strip: the parent keeps the selected value and renders the content.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  value: string
  label: string
  badge?: ReactNode
}

export function Tabs({
  value,
  onValueChange,
  items,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  items: TabItem[]
  className?: string
}) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto scrollbar-thin border-b border-border', className)} role="tablist">
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(item.value)}
            className={cn(
              '-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
            {item.badge}
          </button>
        )
      })}
    </div>
  )
}
