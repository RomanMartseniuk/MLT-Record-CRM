/**
 * Table primitives (Table, TableHeader, TableRow, TableCell, TableEmpty…)
 * styled with the design tokens.
 */

import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function TableWrap({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('w-full overflow-x-auto scrollbar-thin', className)} {...props} />
}

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table className={cn('w-full caption-bottom border-collapse text-sm', className)} {...props} />
}

export function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return <thead className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />
}

export function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={cn('border-b border-border transition-colors hover:bg-muted/50', className)} {...props} />
}

export function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'h-9 px-2 text-left align-middle text-xs font-medium text-muted-foreground whitespace-nowrap',
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('h-10 px-2 align-middle', className)} {...props} />
}

export function TableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-2 py-8 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  )
}
