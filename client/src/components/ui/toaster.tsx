/**
 * Renders the toast notifications held by the UI store.
 */

import { AlertCircle, Check, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUi } from '@/store/ui-context'

export function Toaster() {
  const { toasts, dismissToast } = useUi()

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end">
      {toasts.map((item) => (
        <div
          key={item.id}
          role="status"
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border p-3 shadow-lg',
            item.tone === 'error'
              ? 'border-destructive bg-background'
              : item.tone === 'success'
                ? 'border-success bg-background'
                : 'border-border bg-background',
          )}
        >
          <span className="mt-0.5 shrink-0">
            {item.tone === 'error' ? (
              <AlertCircle className="size-4 text-destructive" />
            ) : item.tone === 'success' ? (
              <Check className="size-4 text-success" />
            ) : (
              <Info className="size-4 text-muted-foreground" />
            )}
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium leading-5">{item.title}</p>
            {item.description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(item.id)}
            aria-label="Закрити"
            className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
