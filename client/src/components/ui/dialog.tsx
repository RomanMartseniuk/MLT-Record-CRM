import { useEffect } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUi } from '@/store/ui-store'
import { Button } from './button'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  /** Ширина на десктопі. На мобільному завжди повноекранний лист. */
  width?: 'sm' | 'md' | 'lg'
}

const WIDTHS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
}

/**
 * Модальне вікно на десктопі та повноекранний лист на мобільному.
 * Закривається по Escape і по кліку на підложку.
 */
export function Dialog({ open, onClose, title, description, children, footer, width = 'md' }: DialogProps) {
  const { isMobile } = useUi()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-foreground/30"
        onClick={onClose}
        role="presentation"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 flex w-full flex-col border-border bg-background',
          isMobile ? 'h-full border-0' : cn('m-4 max-h-[90vh] rounded-lg border', WIDTHS[width]),
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold leading-6">{title}</h2>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Закрити">
            <X />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">{children}</div>

        {footer ? (
          <div
            className={cn(
              'flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end',
              isMobile && 'pb-[max(1rem,env(safe-area-inset-bottom))]',
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function DialogSection({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-4', className)} {...props} />
}
