// Badge — inline label chip.
// Props: variant (default|success|error|warning|info), size (sm|md), dot (boolean)
// Usage: <Badge variant="success">Active</Badge>
//        <Badge variant="error" dot>3 issues</Badge>

import { cn } from '@/lib/utils'

interface BadgeProps {
  children:   React.ReactNode
  variant?:   'default' | 'success' | 'error' | 'warning' | 'info'
  size?:      'sm' | 'md'
  dot?:       boolean
  className?: string
}

const variants = {
  default: 'bg-surface-2 text-foreground border-border',
  success: 'bg-success/10 text-success border-success/30',
  error:   'bg-error/10 text-error border-error/30',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  info:    'bg-accent/10 text-accent border-accent/30',
}

const dotColors = {
  default: 'bg-muted',
  success: 'bg-success',
  error:   'bg-error',
  warning: 'bg-yellow-400',
  info:    'bg-accent',
}

export function Badge({ children, variant = 'default', size = 'sm', dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        variants[variant],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
      {children}
    </span>
  )
}
