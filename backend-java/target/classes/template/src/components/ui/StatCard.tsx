// StatCard — metric display with icon, value, label, and optional trend.
// Usage:
//   <StatCard icon={<Users />} value="1,234" label="Total users"
//     trend={{ value: 12, direction: 'up' }} />

import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon:       React.ReactNode
  value:      string | number
  label:      string
  trend?:     { value: number; direction: 'up' | 'down' }
  className?: string
}

export function StatCard({ icon, value, label, trend, className }: StatCardProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface p-6', className)}>
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
          {icon}
        </div>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium',
              trend.direction === 'up' ? 'text-success' : 'text-error',
            )}
          >
            {trend.direction === 'up'
              ? <TrendingUp className="h-3 w-3" />
              : <TrendingDown className="h-3 w-3" />
            }
            {trend.value}%
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  )
}
