/** Class variants of the Badge (kept out of the component file so that it exports only a component). */

import { cva } from 'class-variance-authority'

/**
 * Statuses must read without colour: a badge always has a label and, where it
 * helps, an icon. Colour only reinforces; it is never the only carrier of meaning.
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
