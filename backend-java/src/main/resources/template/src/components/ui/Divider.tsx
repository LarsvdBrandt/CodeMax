// Divider — horizontal or vertical separator, with optional centred label.
// Usage: <Divider />
//        <Divider label="or" />
//        <Divider orientation="vertical" className="h-6" />

import { cn } from '@/lib/utils'

interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  label?:       string
  className?:   string
}

export function Divider({ orientation = 'horizontal', label, className }: DividerProps) {
  if (orientation === 'vertical') {
    return <div className={cn('w-px bg-border self-stretch', className)} />
  }

  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted">{label}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    )
  }

  return <div className={cn('h-px w-full bg-border', className)} />
}
