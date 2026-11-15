/**
 * Toggle controls: Checkbox and Switch (a label with an optional description).
 */

import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  label,
  description,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  label: ReactNode
  description?: ReactNode
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span className="relative mt-0.5 flex size-4 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="peer size-4 cursor-pointer appearance-none rounded-sm border border-input bg-background checked:border-primary checked:bg-primary disabled:cursor-not-allowed"
        />
        <Check className="pointer-events-none absolute size-3 text-primary-foreground opacity-0 peer-checked:opacity-100" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm leading-5">{label}</span>
        {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  )
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: ReactNode
  disabled?: boolean
}) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2', disabled && 'cursor-not-allowed opacity-50')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full border border-transparent transition-colors',
          checked ? 'bg-primary' : 'bg-muted border-border',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-4 rounded-full transition-all',
            checked ? 'left-4 bg-primary-foreground' : 'left-0.5 bg-muted-foreground',
          )}
        />
      </button>
      {label ? <span className="text-sm">{label}</span> : null}
    </label>
  )
}
