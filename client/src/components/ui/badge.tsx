/**
 * A small status badge. Its class variants live in ./badge-variants.ts.
 */

import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { badgeVariants } from './badge-variants'

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
