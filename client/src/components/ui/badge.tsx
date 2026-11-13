import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Статуси завжди читаються без кольору: бейдж має підпис, а де потрібно — іконку.
 * Колір лише підсилює, але не є єдиним носієм інформації.
 */
export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-muted text-foreground',
        outline: 'border-border text-muted-foreground',
        success: 'border-transparent bg-success text-success-foreground',
        warning: 'border-transparent bg-warning text-warning-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
      },
    },
    defaultVariants: { variant: 'secondary' },
  },
)

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
