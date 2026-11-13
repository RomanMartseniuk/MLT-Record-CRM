import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
  'aria-label'?: string
}

/**
 * Нативний select під стилем shadcn.
 * На мобільному це дає звичний системний вибір — зручно майстру в полі.
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  disabled,
  id,
  ...rest
}: SelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          'h-9 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm',
          'disabled:cursor-not-allowed disabled:opacity-50',
          value === '' && 'text-muted-foreground',
        )}
        {...rest}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
