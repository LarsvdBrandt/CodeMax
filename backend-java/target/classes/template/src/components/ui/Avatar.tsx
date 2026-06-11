// Avatar — user avatar with image fallback to initials.
// AvatarGroup — overlapping stack with "+N" overflow indicator.
//
// Props:
//   src?      string   image URL
//   name?     string   used for alt text and fallback initials
//   size?     xs|sm|md|lg|xl  (24/32/40/48/64 px)
//   className?
//
// Usage:
//   <Avatar src={user.avatarUrl} name={user.name} size="md" />
//   <AvatarGroup users={team} max={4} />

import { useState } from 'react'
import { cn }       from '@/lib/utils'

interface AvatarProps {
  src?:       string
  name?:      string
  size?:      'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  style?:     React.CSSProperties
}

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

function getInitials(name?: string): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const showImg = src && !imgError

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-accent/20 font-semibold text-accent flex-shrink-0 overflow-hidden',
        sizes[size],
        className,
      )}
      title={name}
    >
      {showImg ? (
        <img
          src={src}
          alt={name ?? 'avatar'}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  )
}

interface AvatarGroupProps {
  users: Array<{ src?: string; name?: string }>
  max?:  number
  size?: AvatarProps['size']
}

export function AvatarGroup({ users, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visible  = users.slice(0, max)
  const overflow = users.length - max

  return (
    <div className="flex items-center">
      {visible.map((u, i) => (
        <Avatar
          key={i}
          src={u.src}
          name={u.name}
          size={size}
          className="-ml-2 first:ml-0 ring-2 ring-background"
          style={{ zIndex: visible.length - i } as React.CSSProperties}
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            '-ml-2 inline-flex items-center justify-center rounded-full bg-surface-2 ring-2 ring-background font-medium text-muted',
            sizes[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}
