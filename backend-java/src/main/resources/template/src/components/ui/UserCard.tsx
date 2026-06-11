// CATEGORY: Data Display
// UserCard — compact or full user profile card.
// <UserCard user={...} variant="compact" actions={[{label:'Message', onClick}]} />
import { Mail, Globe, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from './Badge'
import { Button } from './Button'

export interface UserCardUser {
  name:      string
  email?:    string
  role?:     string
  bio?:      string
  avatarUrl?: string
  location?: string
  website?:  string
  tags?:     string[]
  online?:   boolean
}

export interface UserCardAction {
  label:    string
  onClick:  () => void
  variant?: 'primary' | 'secondary' | 'ghost'
}

export interface UserCardProps {
  user:       UserCardUser
  variant?:   'compact' | 'full'
  actions?:   UserCardAction[]
  className?: string
}

function Avatar({ user }: { user: UserCardUser }) {
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="relative inline-block">
      {user.avatarUrl
        ? <img src={user.avatarUrl} alt={user.name} className="h-12 w-12 rounded-full object-cover" />
        : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">{initials}</div>
      }
      {user.online !== undefined && (
        <span className={cn(
          'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface',
          user.online ? 'bg-success' : 'bg-muted',
        )} />
      )}
    </div>
  )
}

export function UserCard({ user, variant = 'compact', actions, className }: UserCardProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-3 rounded-lg border border-border bg-surface p-3', className)}>
        <Avatar user={user} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
          {user.role && <p className="text-xs text-muted">{user.role}</p>}
        </div>
        {actions?.slice(0, 1).map(a => (
          <Button key={a.label} size="sm" variant={a.variant ?? 'secondary'} onClick={a.onClick}>{a.label}</Button>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-border bg-surface overflow-hidden', className)}>
      {/* Banner */}
      <div className="h-20 bg-gradient-to-r from-accent/20 to-accent/5" />

      <div className="px-5 pb-5">
        {/* Avatar overlapping banner */}
        <div className="-mt-6 mb-3">
          <div className="relative inline-block">
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt={user.name} className="h-16 w-16 rounded-full border-4 border-surface object-cover" />
              : <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-surface bg-accent/20 text-lg font-bold text-accent">
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
            }
            {user.online !== undefined && (
              <span className={cn('absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-surface', user.online ? 'bg-success' : 'bg-muted')} />
            )}
          </div>
        </div>

        <p className="text-base font-bold text-foreground">{user.name}</p>
        {user.role && <p className="text-sm text-accent font-medium">{user.role}</p>}
        {user.bio && <p className="mt-2 text-xs text-muted leading-relaxed">{user.bio}</p>}

        {/* Meta */}
        <div className="mt-3 flex flex-col gap-1">
          {user.email && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Mail className="h-3 w-3" />{user.email}
            </span>
          )}
          {user.location && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <MapPin className="h-3 w-3" />{user.location}
            </span>
          )}
          {user.website && (
            <a href={user.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-accent hover:underline">
              <Globe className="h-3 w-3" />{user.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        {/* Tags */}
        {user.tags && user.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {user.tags.map(t => <Badge key={t} size="sm">{t}</Badge>)}
          </div>
        )}

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="mt-4 flex gap-2">
            {actions.map(a => (
              <Button key={a.label} size="sm" variant={a.variant ?? 'primary'} onClick={a.onClick} className="flex-1">
                {a.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
