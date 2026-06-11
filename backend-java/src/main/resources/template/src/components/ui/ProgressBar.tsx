// ProgressBar — horizontal progress indicator.
// Props: value (0–max), max (default 100), color, label, showPercentage
// Usage: <ProgressBar value={72} color="success" label="Storage" showPercentage />

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value:           number
  max?:            number
  color?:          'accent' | 'success' | 'error' | 'warning'
  label?:          string
  showPercentage?: boolean
  className?:      string
}

const colors = {
  accent:  'bg-accent',
  success: 'bg-success',
  error:   'bg-error',
  warning: 'bg-yellow-500',
}

export function ProgressBar({ value, max = 100, color = 'accent', label, showPercentage, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1.5">
          {label       && <span className="text-sm text-muted">{label}</span>}
          {showPercentage && <span className="text-xs text-muted">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', colors[color])}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  )
}
