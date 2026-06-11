// CATEGORY: Data Display
// Timeline — chronological list of events with icons and metadata.
// <Timeline items={[{id:'1', title:'Deployed', time:'2h ago', icon:<Rocket/>, variant:'success'}]} />
import { cn } from '@/lib/utils'

export type TimelineVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

export interface TimelineItem {
  id:          string
  title:       string
  description?: string
  time?:       string
  icon?:       React.ReactNode
  variant?:    TimelineVariant
  extra?:      React.ReactNode
}

export interface TimelineProps {
  items:      TimelineItem[]
  className?: string
}

const VARIANT_STYLES: Record<TimelineVariant, string> = {
  default: 'bg-surface-2 border-border text-muted',
  success: 'bg-success/15 border-success/40 text-success',
  warning: 'bg-warning/15 border-warning/40 text-warning',
  error:   'bg-error/15 border-error/40 text-error',
  info:    'bg-info/15 border-info/40 text-info',
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {items.map((item, i) => (
        <div key={item.id} className="flex gap-4">
          {/* Left: icon + vertical line */}
          <div className="flex flex-col items-center">
            <div className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-sm',
              VARIANT_STYLES[item.variant ?? 'default'],
            )}>
              {item.icon ?? <span className="h-2 w-2 rounded-full bg-current" />}
            </div>
            {i < items.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
          </div>

          {/* Right: content */}
          <div className={cn('flex-1 pb-6', i === items.length - 1 && 'pb-0')}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              {item.time && <span className="text-xs text-muted flex-shrink-0">{item.time}</span>}
            </div>
            {item.description && <p className="mt-0.5 text-xs text-muted">{item.description}</p>}
            {item.extra && <div className="mt-2">{item.extra}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
