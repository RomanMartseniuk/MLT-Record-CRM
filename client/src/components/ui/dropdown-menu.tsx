import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface DropdownMenuProps {
  trigger: ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: 'start' | 'end'
  className?: string
}

/** A simple menu: closes on a click outside it and on Escape. */
export function DropdownMenu({ trigger, children, align = 'end', className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div className="relative" ref={containerRef}>
      <div onClick={() => setOpen((value) => !value)}>{trigger}</div>
      {open ? (
        <div
          className={cn(
            'absolute top-full z-40 mt-1 min-w-48 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg',
            align === 'end' ? 'right-0' : 'left-0',
            className,
          )}
          role="menu"
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      ) : null}
    </div>
  )
}

export function DropdownItem({
  children,
  onSelect,
  disabled,
  tone = 'default',
  icon,
}: {
  children: ReactNode
  onSelect?: () => void
  disabled?: boolean
  tone?: 'default' | 'destructive'
  icon?: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm',
        'disabled:pointer-events-none disabled:opacity-50',
        tone === 'destructive' ? 'text-destructive hover:bg-destructive/10' : 'hover:bg-muted',
        '[&_svg]:size-4 [&_svg]:shrink-0',
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
    </button>
  )
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{children}</div>
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border" />
}
