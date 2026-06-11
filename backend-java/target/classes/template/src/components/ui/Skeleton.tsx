// Skeleton — animated loading placeholder.
// Props: variant (text|circle|rect), width, height, className
// Usage: <Skeleton variant="text" width="60%" />
//        <Skeleton variant="circle" className="h-10 w-10" />
//        <Skeleton variant="rect" className="h-40 w-full rounded-lg" />

import { cn } from '@/lib/utils'

interface SkeletonProps {
  variant?:   'text' | 'circle' | 'rect'
  width?:     string | number
  height?:    string | number
  className?: string
  lines?:     number  // for variant="text", renders N stacked lines
}

export function Skeleton({ variant = 'rect', width, height, className, lines = 1 }: SkeletonProps) {
  const base = 'animate-pulse bg-surface-2'

  if (variant === 'text') {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(base, 'h-4 rounded', className)}
            style={{
              width:  i === lines - 1 && lines > 1 ? '75%' : (width ?? '100%'),
              height: height,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(base, variant === 'circle' ? 'rounded-full' : 'rounded', className)}
      style={{ width, height }}
    />
  )
}
