import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}

/** A table skeleton shown while data is loading. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col gap-2 p-2">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-2">
          {Array.from({ length: cols }).map((__, colIndex) => (
            <Skeleton key={colIndex} className="h-6 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-24" />
      ))}
    </div>
  )
}
