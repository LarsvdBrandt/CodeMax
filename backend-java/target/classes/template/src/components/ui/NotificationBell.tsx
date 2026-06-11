// CATEGORY: Navigation / Feedback
// NotificationBell — bell icon with unread count badge and dropdown list.
// <NotificationBell notifications={items} onRead={markRead} onClearAll={clearAll} />
import { useState, useRef, useEffect } from 'react'
import { Bell, X, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NotifVariant = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id:       string
  title:    string
  body?:    string
  time:     string
  read:     boolean
  variant?: NotifVariant
  icon?:    React.ReactNode
  onClick?: () => void
}

export interface NotificationBellProps {
  notifications: Notification[]
  onRead?:       (id: string) => void
  onDismiss?:    (id: string) => void
  onClearAll?:   () => void
  className?:    string
}

const DOT_COLORS: Record<NotifVariant, string> = {
  info:    'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  error:   'bg-error',
}

export function NotificationBell({ notifications, onRead, onDismiss, onClearAll, className }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-border bg-surface shadow-float overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && onRead && (
                <button onClick={() => notifications.filter(n => !n.read).forEach(n => onRead(n.id))}
                  className="flex items-center gap-1 text-[11px] text-accent hover:underline">
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              )}
              {onClearAll && (
                <button onClick={onClearAll} className="text-[11px] text-muted hover:text-foreground">Clear all</button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0
              ? <p className="py-8 text-center text-sm text-muted">No notifications</p>
              : notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => { n.onClick?.(); if (!n.read) onRead?.(n.id) }}
                  className={cn('flex gap-3 px-4 py-3 cursor-pointer hover:bg-surface-2 transition-colors', !n.read && 'bg-accent/5')}
                >
                  <div className="flex flex-col items-center pt-1">
                    <span className={cn('h-2 w-2 rounded-full flex-shrink-0 mt-1', n.read ? 'bg-transparent' : DOT_COLORS[n.variant ?? 'info'])} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-medium', n.read ? 'text-muted' : 'text-foreground')}>{n.title}</p>
                    {n.body && <p className="mt-0.5 text-[11px] text-muted line-clamp-2">{n.body}</p>}
                    <p className="mt-1 text-[10px] text-muted">{n.time}</p>
                  </div>
                  {onDismiss && (
                    <button onClick={e => { e.stopPropagation(); onDismiss(n.id) }} className="text-muted hover:text-foreground flex-shrink-0 mt-0.5">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}
