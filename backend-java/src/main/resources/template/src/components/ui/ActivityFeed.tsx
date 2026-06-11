// CATEGORY: Data Display
// ActivityFeed — user-action feed (like GitHub or Jira activity streams).
// <ActivityFeed items={activities} />
import { cn } from '@/lib/utils'

export interface ActivityItem {
  id:      string
  actor:   { name: string; avatarUrl?: string }
  action:  string           // e.g. "commented on"
  target?: string           // e.g. "Issue #42"
  time:    string
  icon?:   React.ReactNode
  extra?:  React.ReactNode  // e.g. a quoted comment
}

export interface ActivityFeedProps {
  items:      ActivityItem[]
  className?: string
}

function InitialAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
      {initials}
    </div>
  )
}

export function ActivityFeed({ items, className }: ActivityFeedProps) {
  return (
    <div className={cn('flex flex-col divide-y divide-border', className)}>
      {items.map(item => (
        <div key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          {item.actor.avatarUrl
            ? <img src={item.actor.avatarUrl} alt={item.actor.name} className="h-7 w-7 rounded-full object-cover flex-shrink-0" />
            : <InitialAvatar name={item.actor.name} />
          }
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">
              <span className="font-medium">{item.actor.name}</span>
              {' '}
              <span className="text-muted">{item.action}</span>
              {item.target && <>{' '}<span className="font-medium text-accent">{item.target}</span></>}
            </p>
            {item.extra && <div className="mt-1.5 rounded border-l-2 border-border pl-3 text-xs text-muted">{item.extra}</div>}
            <p className="mt-1 text-[11px] text-muted">{item.time}</p>
          </div>
          {item.icon && <div className="flex-shrink-0 text-muted mt-0.5">{item.icon}</div>}
        </div>
      ))}
    </div>
  )
}
