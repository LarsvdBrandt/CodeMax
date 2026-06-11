// ─────────────────────────────────────────────────────────────────────────────
// Button — reusable button with variant & size props.
//
// Variants: primary | secondary | ghost | danger
// Sizes:    sm | md | lg
//
// Usage:
//   <Button variant="primary" size="lg" onClick={...}>Get Started</Button>
//   <Button variant="ghost" isLoading>Saving…</Button>
// ─────────────────────────────────────────────────────────────────────────────

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  'primary' | 'secondary' | 'ghost' | 'danger'
  size?:     'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?:  React.ReactNode
  rightIcon?: React.ReactNode
}

// Base classes shared by all variants
const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none'

const variants = {
  primary:   'bg-accent text-white hover:bg-accent/90 active:scale-[0.98]',
  secondary: 'bg-surface-2 text-foreground border border-border hover:bg-surface hover:border-muted active:scale-[0.98]',
  ghost:     'text-muted hover:text-foreground hover:bg-surface-2 active:scale-[0.98]',
  danger:    'bg-error/10 text-error border border-error/30 hover:bg-error/20 active:scale-[0.98]',
}

const sizes = {
  sm: 'h-8  px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant   = 'primary',
      size      = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  ),
)

Button.displayName = 'Button'
