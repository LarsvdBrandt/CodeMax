// Spinner — loading indicator.
// Props: size (sm|md|lg), color (accent|white|muted)
// Usage: <Spinner size="md" /> <Spinner color="white" />

import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?:      'sm' | 'md' | 'lg'
  color?:     'accent' | 'white' | 'muted'
  className?: string
}

const sizes  = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-8 w-8 border-[3px]' }
const colors = { accent: 'border-accent border-t-transparent', white: 'border-white border-t-transparent', muted: 'border-muted border-t-transparent' }

export function Spinner({ size = 'md', color = 'accent', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block rounded-full animate-spin', sizes[size], colors[color], className)}
    />
  )
}
