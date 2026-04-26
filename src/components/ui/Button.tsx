import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'tertiary'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  block?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-pc-navy text-white hover:bg-pc-navy-hover active:bg-pc-navy-hover',
  secondary:
    'bg-pc-navy-soft text-pc-navy hover:bg-pc-border',
  tertiary:
    'bg-transparent text-pc-text-muted hover:text-pc-text',
}

export function Button({
  variant = 'primary',
  block,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'rounded-pc-button px-4 py-3 text-pc-body font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:shadow-pc-focus',
        variantClasses[variant],
        block && 'w-full block',
        className,
      )}
      {...rest}
    />
  )
}
